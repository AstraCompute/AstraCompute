// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentRegistryMin, IAgentSharesMin, IStakingVaultMin} from "./Interfaces.sol";

/// @title TaskMarketplace - the coordination game at the center of AGORA.
/// @notice Humans (or other agents) post tasks with CYCLE rewards held in
/// escrow. Registered agents bid; when bidding closes, the cheapest bid wins
/// and the winner posts a performance bond. The agent rents compute, does the
/// work, and submits a result. On approval the winning bid is split four
/// ways: protocol fee -> staking vault, dividend -> the agent's shareholders,
/// remainder -> the agent's wallet, and the unspent reward returns to the
/// poster. Rejections and blown deadlines burn the agent's bond (half to the
/// poster as compensation, half to the vault) and ding reputation.
contract TaskMarketplace is Ownable, ReentrancyGuard {
    enum TaskStatus {
        Open,       // accepting bids
        Assigned,   // winner selected, bond posted, work in progress
        Submitted,  // result delivered, awaiting poster review
        Completed,  // approved (or review timed out) - everyone paid
        Rejected,   // poster rejected the result
        Expired,    // agent missed the execution deadline
        Cancelled   // no bids / poster withdrew while open
    }

    struct Task {
        uint64 id;
        address poster;
        uint256 reward;      // escrowed CYCLE, max the poster will pay
        uint256 agentBond;   // bond the winner must post (bps of reward)
        uint64 createdAt;
        uint64 biddingEnds;
        uint32 execWindow;         // seconds granted after assignment
        uint64 executionDeadline;  // set at assignment
        uint64 reviewDeadline;     // set at submission
        TaskStatus status;
        uint64 assignedAgentId;
        uint256 winningBid;
        string spec;   // machine-readable task spec (see agent runtime)
        string tags;
        string resultURI;
        bytes32 resultHash;
    }

    struct Bid {
        uint64 agentId;
        uint256 amount;
        uint64 at;
        bool voided; // set if the bond pull failed at finalization
    }

    IERC20 public immutable cycle;
    IAgentRegistryMin public immutable registry;
    IAgentSharesMin public immutable shares;
    IStakingVaultMin public immutable vault;

    uint64 public taskCount;
    mapping(uint64 => Task) private _tasks;
    mapping(uint64 => Bid[]) private _bids;

    // open-task set with O(1) removal, for cheap discovery by agents/UIs
    uint64[] private _openTaskIds;
    mapping(uint64 => uint256) private _openIndex; // taskId => index+1

    uint256 public minReward = 1 ether;
    uint16 public bondBps = 1000;        // 10% of reward
    uint16 public feeBps = 500;          // 5% of winning bid -> vault
    uint16 public dividendBps = 1000;    // 10% of winning bid -> agent shareholders
    uint32 public reviewWindow = 120;    // poster review time before auto-approve
    uint16 public constant MAX_BIDS = 32;

    uint256 public totalVolume;      // CYCLE paid out to agents (winning bids)
    uint256 public totalFeesRouted;  // CYCLE routed to the vault by this market

    event TaskPosted(
        uint64 indexed taskId,
        address indexed poster,
        uint256 reward,
        uint64 biddingEnds,
        uint32 execWindow,
        string spec,
        string tags
    );
    event BidPlaced(uint64 indexed taskId, uint64 indexed agentId, uint256 amount);
    event TaskAssigned(uint64 indexed taskId, uint64 indexed agentId, uint256 winningBid, uint64 executionDeadline);
    event ResultSubmitted(uint64 indexed taskId, uint64 indexed agentId, string resultURI, bytes32 resultHash, uint64 reviewDeadline);
    event TaskCompleted(uint64 indexed taskId, uint64 indexed agentId, uint256 agentPayout, uint256 fee, uint256 dividend, bool viaTimeout);
    event TaskRejected(uint64 indexed taskId, uint64 indexed agentId, string reason);
    event TaskExpired(uint64 indexed taskId, uint64 indexed agentId);
    event TaskCancelled(uint64 indexed taskId);

    constructor(
        IERC20 _cycle,
        IAgentRegistryMin _registry,
        IAgentSharesMin _shares,
        IStakingVaultMin _vault