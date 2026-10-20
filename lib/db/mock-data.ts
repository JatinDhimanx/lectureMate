export interface DemoLectureData {
  id: string;
  userId?: string;
  title: string;
  sourceType: string;
  sourceUrl?: string;
  rawTranscript: string;
  cleanTranscript: string;
  language: string;
  wordCount: number;
  durationSeconds: number;
  qualityReport: {
    totalGenerated: number;
    cardsKept: number;
    duplicatesRemoved: number;
    ungroundedDropped: number;
    averageGroundedness: number;
    averageClarity: number;
  };
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    orderIndex: number;
    startChar: number;
    endChar: number;
    startTimeSeconds: number;
    endTimeSeconds: number;
  }>;
  concepts: Array<{
    id: string;
    name: string;
    definition: string;
    importanceScore: number;
    examCue: boolean;
    masteryScore: number;
    sourceSpan: {
      startChar: number;
      endChar: number;
      quote: string;
    };
  }>;
  conceptEdges: Array<{
    id: string;
    sourceConceptId: string;
    targetConceptId: string;
    relationType: string;
  }>;
  cards: Array<{
    id: string;
    conceptId: string;
    type: "basic" | "cloze" | "why_how" | "worked_example";
    front: string;
    back: string;
    bloomLevel: "remember" | "understand" | "apply" | "analyze";
    difficulty: number;
    evidenceQuote: string;
    evidenceSpan: {
      startChar: number;
      endChar: number;
      startTimeSeconds?: number;
      endTimeSeconds?: number;
    };
    qualityScores: {
      groundedness: number;
      clarity: number;
      uniqueness: number;
    };
    tags: string[];
    fsrsState: "New" | "Learning" | "Review" | "Relearning";
    dueDate: string;
    stability: number;
    fsrsDifficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    reps: number;
    lapses: number;
  }>;
  quizQuestions: Array<{
    id: string;
    conceptId: string;
    questionType: "mcq" | "true_false" | "short_answer";
    prompt: string;
    correctAnswer: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      whyWrong?: string;
    }>;
    explanation: string;
    evidenceQuote: string;
    evidenceSpan: {
      startChar: number;
      endChar: number;
    };
    bloomLevel: "remember" | "understand" | "apply" | "analyze";
  }>;
}

export const SAMPLE_LECTURE_RAW = `Good morning everyone. Today we are diving into one of the most foundational topics in modern computer science: Distributed Systems, the CAP Theorem, and the Paxos Consensus algorithm.

Let's begin with a fundamental truth about distributed architectures. When you build a system that spans across multiple physical machines or data centers, failures are not exceptions; failures are the norm. Network cables get cut, routers experience buffer overruns, servers run out of memory, and virtual machines experience CPU throttling. 

Now, this brings us directly to Eric Brewer's CAP Theorem, which I guarantee will be on your midterm exam. So pay close attention to this formulation. The CAP Theorem asserts that any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.

Let's unpack what these three letters actually mean. First, Consistency. In the context of CAP, consistency does not mean database ACID consistency. It specifically means linearizability. Every read operation must receive the most recent write or an error. In other words, all client nodes see the exact same data at the exact same instant in time. Second, Availability. Availability means that every non-failing node must return a non-error response for every request it receives, though without guaranteeing that it contains the most recent write. And third, Partition Tolerance. Partition tolerance means the system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

Here is the critical insight that many engineers misunderstand: you cannot simply choose Consistency and Availability and reject Partition Tolerance in a real-world wide-area network. Network partitions are physical realities of physics and networking. Network packets will be lost. Therefore, in the presence of a network partition, you are forced to make a trade-off: either you prioritize Consistency by rejecting writes on minority partitions, or you prioritize Availability by accepting writes on all partitions at the risk of returning stale or conflicting data.

When a system chooses Availability over strict Consistency, it often adopts what we call Eventual Consistency. Under eventual consistency, if no new updates are made to a given data item, all replicas will eventually converge and return the last updated value. DynamoDB and Apache Cassandra are classic examples of systems designed with tunable eventual consistency.

Now let us turn to Consensus. What is consensus? In distributed computing, consensus is the process of getting a group of independent processes or nodes to agree on a single data value or a sequence of state transitions. Consensus is trivial when there are no failures: you just ask a single leader node. But when nodes can crash or when messages are delayed arbitrarily, achieving consensus becomes notoriously difficult.

This brings us to the Paxos algorithm, proposed by Leslie Lamport. Remember this name: Paxos is the gold standard for consensus in asynchronous networks with crash-stop failures. Paxos proceeds in two primary phases: Phase 1 is Prepare and Promise, and Phase 2 is Accept and Accepted.

In Phase 1a, a node acting as a Proposer chooses a unique, monotonically increasing proposal number, let's call it n, and sends a Prepare request with number n to a majority quorum of Acceptors. In Phase 1b, if an Acceptor receives a Prepare request with number n greater than that of any Prepare request it has already responded to, it sends back a Promise not to accept any future proposals numbered less than n, along with the highest-numbered proposal that it has already accepted, if any.

Then we move to Phase 2. In Phase 2a, if the Proposer receives promises from a quorum of Acceptors, it sends an Accept request with number n and value v to those Acceptors, where v is the value of the highest-numbered proposal among the responses, or any value chosen by the Proposer if no Acceptor reported an existing value. In Phase 2b, an Acceptor accepts proposal number n and value v unless it has already promised to consider only proposals numbered greater than n.

Why is the concept of a Quorum so fundamental here? A Quorum is defined as a strict majority of nodes, mathematically represented as floor of N over two plus one. Because any two majority quorums in a cluster of N nodes must overlap by at least one node, the overlapping node guarantees that any newly elected leader or accepted proposal will observe the state of previously accepted values. This mathematical intersection property is what prevents the catastrophic Split-Brain problem.

What is Split-Brain? Split-Brain occurs when a network partition divides a distributed cluster into two or more disconnected components, and each component mistakenly believes the other has died, electing its own independent leader and accepting divergent conflicting writes. By enforcing that only a partition containing a strict majority quorum can proceed with writes, Paxos fundamentally eliminates split-brain anomalies.

To summarize the three key takeaways for today: First, in any physical distributed network, Partition Tolerance is non-negotiable, leaving you to balance Consistency against Availability. Second, Eventual Consistency allows distributed systems to remain available by accepting temporary divergence until replicas synchronize. And third, Paxos achieves consensus across asynchronous nodes through two-phase quorum voting, preventing split-brain states via quorum intersection. In our next lecture, we will study the Raft consensus algorithm and see how it simplifies Paxos for human understandability.`;

export const SAMPLE_LECTURE_CLEAN = SAMPLE_LECTURE_RAW; // Cleaned representation

export const SAMPLE_LECTURE_DATA: DemoLectureData = {
  id: "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a",
  title: "Distributed Systems: CAP Theorem, Paxos Consensus & Quorums",
  sourceType: "paste",
  sourceUrl: undefined,
  rawTranscript: SAMPLE_LECTURE_RAW,
  cleanTranscript: SAMPLE_LECTURE_CLEAN,
  language: "en",
  wordCount: 846,
  durationSeconds: 1540,
  qualityReport: {
    totalGenerated: 28,
    cardsKept: 26,
    duplicatesRemoved: 1,
    ungroundedDropped: 1,
    averageGroundedness: 0.98,
    averageClarity: 0.96,
  },
  sections: [
    {
      id: "sec-1",
      title: "Foundations & The Reality of Network Failures",
      summary: "Distributed architectures inevitably experience hardware, network, and latency failures, making fault tolerance a primary design concern.",
      orderIndex: 0,
      startChar: 0,
      endChar: 467,
      startTimeSeconds: 0,
      endTimeSeconds: 240,
    },
    {
      id: "sec-2",
      title: "Eric Brewer's CAP Theorem",
      summary: "Detailed breakdown of Consistency (linearizability), Availability, and Partition Tolerance, and why partitions force a choice between C and A.",
      orderIndex: 1,
      startChar: 468,
      endChar: 1729,
      startTimeSeconds: 241,
      endTimeSeconds: 610,
    },
    {
      id: "sec-3",
      title: "Eventual Consistency & Trade-offs",
      summary: "How systems like DynamoDB and Cassandra maintain availability by allowing replicas to converge over time.",
      orderIndex: 2,
      startChar: 1730,
      endChar: 2062,
      startTimeSeconds: 611,
      endTimeSeconds: 780,
    },
    {
      id: "sec-4",
      title: "Distributed Consensus & The Paxos Algorithm",
      summary: "Leslie Lamport's two-phase consensus algorithm: Phase 1 (Prepare/Promise) and Phase 2 (Accept/Accepted).",
      orderIndex: 3,
      startChar: 2063,
      endChar: 3418,
      startTimeSeconds: 781,
      endTimeSeconds: 1220,
    },
    {
      id: "sec-5",
      title: "Quorums and Mitigating the Split-Brain Problem",
      summary: "Mathematical quorum intersection (floor(N/2)+1) prevents disconnected partitions from electing duplicate conflicting leaders.",
      orderIndex: 4,
      startChar: 3419,
      endChar: 4460,
      startTimeSeconds: 1221,
      endTimeSeconds: 1540,
    },
  ],
  concepts: [
    {
      id: "c-1",
      name: "CAP Theorem",
      definition: "Any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.",
      importanceScore: 0.98,
      examCue: true,
      masteryScore: 0.85,
      sourceSpan: {
        startChar: 600,
        endChar: 778,
        quote: "The CAP Theorem asserts that any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.",
      },
    },
    {
      id: "c-2",
      name: "Linearizability (CAP Consistency)",
      definition: "Every read operation must receive the most recent write or an error, ensuring all client nodes observe the exact same state simultaneously.",
      importanceScore: 0.92,
      examCue: false,
      masteryScore: 0.70,
      sourceSpan: {
        startChar: 885,
        endChar: 1070,
        quote: "In the context of CAP, consistency does not mean database ACID consistency. It specifically means linearizability. Every read operation must receive the most recent write or an error.",
      },
    },
    {
      id: "c-3",
      name: "Eventual Consistency",
      definition: "A consistency model where if no new updates occur, all replicas will eventually synchronize and return the latest value.",
      importanceScore: 0.84,
      examCue: false,
      masteryScore: 0.90,
      sourceSpan: {
        startChar: 1802,
        endChar: 1965,
        quote: "Under eventual consistency, if no new updates are made to a given data item, all replicas will eventually converge and return the last updated value.",
      },
    },
    {
      id: "c-4",
      name: "Paxos Consensus Algorithm",
      definition: "A two-phase consensus algorithm for asynchronous networks with crash-stop failures using Prepare/Promise and Accept/Accepted phases.",
      importanceScore: 0.96,
      examCue: true,
      masteryScore: 0.45,
      sourceSpan: {
        startChar: 2470,
        endChar: 2680,
        quote: "Paxos is the gold standard for consensus in asynchronous networks with crash-stop failures. Paxos proceeds in two primary phases: Phase 1 is Prepare and Promise, and Phase 2 is Accept and Accepted.",
      },
    },
    {
      id: "c-5",
      name: "Quorum",
      definition: "A strict majority of nodes (floor(N/2) + 1) ensuring any two quorums overlap by at least one node to guarantee state continuity.",
      importanceScore: 0.91,
      examCue: false,
      masteryScore: 0.65,
      sourceSpan: {
        startChar: 3465,
        endChar: 3600,
        quote: "A Quorum is defined as a strict majority of nodes, mathematically represented as floor of N over two plus one.",
      },
    },
    {
      id: "c-6",
      name: "Split-Brain Problem",
      definition: "An anomaly where a network partition isolates nodes into disconnected groups that independently elect leaders and accept divergent writes.",
      importanceScore: 0.89,
      examCue: false,
      masteryScore: 0.55,
      sourceSpan: {
        startChar: 3950,
        endChar: 4210,
        quote: "Split-Brain occurs when a network partition divides a distributed cluster into two or more disconnected components, and each component mistakenly believes the other has died, electing its own independent leader and accepting divergent conflicting writes.",
      },
    },
  ],
  conceptEdges: [
    {
      id: "e-1",
      sourceConceptId: "c-1",
      targetConceptId: "c-2",
      relationType: "part_of",
    },
    {
      id: "e-2",
      sourceConceptId: "c-1",
      targetConceptId: "c-3",
      relationType: "extends",
    },
    {
      id: "e-3",
      sourceConceptId: "c-1",
      targetConceptId: "c-4",
      relationType: "prerequisite",
    },
    {
      id: "e-4",
      sourceConceptId: "c-5",
      targetConceptId: "c-4",
      relationType: "prerequisite",
    },
    {
      id: "e-5",
      sourceConceptId: "c-5",
      targetConceptId: "c-6",
      relationType: "mitigates",
    },
  ],
  cards: [
    {
      id: "card-1",
      conceptId: "c-1",
      type: "basic",
      front: "What does the CAP Theorem state regarding distributed data stores?",
      back: "Any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.",
      bloomLevel: "remember",
      difficulty: 2,
      evidenceQuote: "The CAP Theorem asserts that any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.",
      evidenceSpan: { startChar: 600, endChar: 778, startTimeSeconds: 275 },
      qualityScores: { groundedness: 1.0, clarity: 1.0, uniqueness: 0.95 },
      tags: ["Distributed Systems", "CAP Theorem", "Architecture"],
      fsrsState: "Review",
      dueDate: new Date(Date.now() - 3600000).toISOString(), // Due today
      stability: 4.2,
      fsrsDifficulty: 2.8,
      elapsedDays: 4,
      scheduledDays: 4,
      reps: 3,
      lapses: 0,
    },
    {
      id: "card-2",
      conceptId: "c-2",
      type: "cloze",
      front: "In the context of the CAP theorem, consistency specifically refers to {{c1::linearizability}}, meaning every read receives {{c2::the most recent write or an error}}.",
      back: "Consistency in CAP refers to linearizability (all clients see the exact same data at the exact same instant), not relational ACID consistency.",
      bloomLevel: "understand",
      difficulty: 3,
      evidenceQuote: "In the context of CAP, consistency does not mean database ACID consistency. It specifically means linearizability. Every read operation must receive the most recent write or an error.",
      evidenceSpan: { startChar: 885, endChar: 1070, startTimeSeconds: 340 },
      qualityScores: { groundedness: 1.0, clarity: 0.95, uniqueness: 0.9 },
      tags: ["Consistency", "Linearizability", "CAP"],
      fsrsState: "Review",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      stability: 6.8,
      fsrsDifficulty: 3.1,
      elapsedDays: 2,
      scheduledDays: 5,
      reps: 2,
      lapses: 0,
    },
    {
      id: "card-3",
      conceptId: "c-1",
      type: "why_how",
      front: "Why is it impossible to build a CA (Consistent + Available) distributed system in a real-world wide-area network?",
      back: "Because network partitions are physical inevitabilities. When a partition occurs, the system must either reject writes (sacrificing Availability) or accept inconsistent writes (sacrificing Consistency). You cannot reject Partition Tolerance.",
      bloomLevel: "analyze",
      difficulty: 4,
      evidenceQuote: "Network partitions are physical realities of physics and networking. Network packets will be lost. Therefore, in the presence of a network partition, you are forced to make a trade-off: either you prioritize Consistency by rejecting writes on minority partitions, or you prioritize Availability by accepting writes on all partitions at the risk of returning stale or conflicting data.",
      evidenceSpan: { startChar: 1358, endChar: 1729, startTimeSeconds: 480 },
      qualityScores: { groundedness: 0.98, clarity: 0.96, uniqueness: 0.95 },
      tags: ["Trade-offs", "CAP Theorem", "Networking"],
      fsrsState: "Learning",
      dueDate: new Date(Date.now() - 1800000).toISOString(), // Due today
      stability: 1.5,
      fsrsDifficulty: 4.2,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
    },
    {
      id: "card-4",
      conceptId: "c-3",
      type: "basic",
      front: "What is Eventual Consistency?",
      back: "A consistency model where, if no new updates are made to an item, all replicas will eventually converge and return the last updated value.",
      bloomLevel: "remember",
      difficulty: 2,
      evidenceQuote: "Under eventual consistency, if no new updates are made to a given data item, all replicas will eventually converge and return the last updated value.",
      evidenceSpan: { startChar: 1802, endChar: 1965, startTimeSeconds: 640 },
      qualityScores: { groundedness: 1.0, clarity: 1.0, uniqueness: 0.92 },
      tags: ["Cassandra", "DynamoDB", "Eventual Consistency"],
      fsrsState: "Review",
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      stability: 14.5,
      fsrsDifficulty: 2.1,
      elapsedDays: 7,
      scheduledDays: 14,
      reps: 5,
      lapses: 0,
    },
    {
      id: "card-5",
      conceptId: "c-4",
      type: "basic",
      front: "What are the two primary phases of the Paxos consensus algorithm?",
      back: "Phase 1: Prepare and Promise (Phase 1a & 1b)\nPhase 2: Accept and Accepted (Phase 2a & 2b)",
      bloomLevel: "remember",
      difficulty: 3,
      evidenceQuote: "Paxos proceeds in two primary phases: Phase 1 is Prepare and Promise, and Phase 2 is Accept and Accepted.",
      evidenceSpan: { startChar: 2577, endChar: 2680, startTimeSeconds: 890 },
      qualityScores: { groundedness: 1.0, clarity: 1.0, uniqueness: 0.94 },
      tags: ["Paxos", "Consensus", "Distributed Algorithms"],
      fsrsState: "New",
      dueDate: new Date().toISOString(), // Due today
      stability: 0,
      fsrsDifficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "card-6",
      conceptId: "c-4",
      type: "worked_example",
      front: "In Paxos Phase 1b, an Acceptor receives a Prepare request with number n = 15. It previously responded to n = 10 with no accepted value. What does the Acceptor return?",
      back: "The Acceptor sends a Promise not to accept any future proposals numbered less than 15, and reports that it has not yet accepted any proposal value.",
      bloomLevel: "apply",
      difficulty: 4,
      evidenceQuote: "In Phase 1b, if an Acceptor receives a Prepare request with number n greater than that of any Prepare request it has already responded to, it sends back a Promise not to accept any future proposals numbered less than n, along with the highest-numbered proposal that it has already accepted, if any.",
      evidenceSpan: { startChar: 2824, endChar: 3125, startTimeSeconds: 960 },
      qualityScores: { groundedness: 0.97, clarity: 0.96, uniqueness: 0.98 },
      tags: ["Paxos", "Trace", "Phase 1"],
      fsrsState: "New",
      dueDate: new Date().toISOString(), // Due today
      stability: 0,
      fsrsDifficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "card-7",
      conceptId: "c-5",
      type: "basic",
      front: "How is a Quorum defined mathematically in a cluster of N nodes?",
      back: "A strict majority: floor(N / 2) + 1 nodes.",
      bloomLevel: "remember",
      difficulty: 1,
      evidenceQuote: "A Quorum is defined as a strict majority of nodes, mathematically represented as floor of N over two plus one.",
      evidenceSpan: { startChar: 3465, endChar: 3600, startTimeSeconds: 1240 },
      qualityScores: { groundedness: 1.0, clarity: 1.0, uniqueness: 0.96 },
      tags: ["Quorum", "Math", "Majority"],
      fsrsState: "Review",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      stability: 8.2,
      fsrsDifficulty: 2.2,
      elapsedDays: 3,
      scheduledDays: 8,
      reps: 4,
      lapses: 0,
    },
    {
      id: "card-8",
      conceptId: "c-5",
      type: "why_how",
      front: "Why does the quorum intersection property guarantee consistency in Paxos?",
      back: "Because any two majority quorums must overlap by at least one node. The overlapping node is guaranteed to observe and communicate the highest-numbered accepted proposal to any newly formed quorum.",
      bloomLevel: "understand",
      difficulty: 3,
      evidenceQuote: "Because any two majority quorums in a cluster of N nodes must overlap by at least one node, the overlapping node guarantees that any newly elected leader or accepted proposal will observe the state of previously accepted values.",
      evidenceSpan: { startChar: 3602, endChar: 3870, startTimeSeconds: 1290 },
      qualityScores: { groundedness: 1.0, clarity: 0.98, uniqueness: 0.95 },
      tags: ["Quorum", "Intersection", "Proof"],
      fsrsState: "Review",
      dueDate: new Date(Date.now() - 7200000).toISOString(), // Due today
      stability: 3.5,
      fsrsDifficulty: 3.0,
      elapsedDays: 3,
      scheduledDays: 3,
      reps: 2,
      lapses: 0,
    },
    {
      id: "card-9",
      conceptId: "c-6",
      type: "why_how",
      front: "How does requiring a strict majority quorum prevent the Split-Brain problem?",
      back: "In any network partition, at most one partition can contain a strict majority (floor(N/2)+1) of nodes. Minority partitions cannot form a quorum and must reject writes, preventing divergent conflicting leaders.",
      bloomLevel: "analyze",
      difficulty: 4,
      evidenceQuote: "By enforcing that only a partition containing a strict majority quorum can proceed with writes, Paxos fundamentally eliminates split-brain anomalies.",
      evidenceSpan: { startChar: 4212, endChar: 4365, startTimeSeconds: 1410 },
      qualityScores: { groundedness: 0.98, clarity: 0.97, uniqueness: 0.96 },
      tags: ["Split-Brain", "Fault Tolerance", "Safety"],
      fsrsState: "Learning",
      dueDate: new Date(Date.now() - 600000).toISOString(), // Due today
      stability: 1.2,
      fsrsDifficulty: 3.8,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
    },
  ],
  quizQuestions: [
    {
      id: "q-1",
      conceptId: "c-1",
      questionType: "mcq",
      prompt: "According to the CAP Theorem, why can a distributed system on a wide-area network not guarantee both Consistency and Availability simultaneously?",
      correctAnswer: "Network partitions are physically unavoidable, forcing the system to either reject writes or return inconsistent data during a partition.",
      options: [
        {
          id: "opt-1a",
          text: "Network partitions are physically unavoidable, forcing the system to either reject writes or return inconsistent data during a partition.",
          isCorrect: true,
        },
        {
          id: "opt-1b",
          text: "Modern hardware clocks drift too quickly to maintain synchronized timestamps across servers.",
          isCorrect: false,
          whyWrong: "Clock synchronization affects distributed transactions (like Google Spanner's TrueTime), but is not the reason CAP forces a trade-off during network partitions.",
        },
        {
          id: "opt-1c",
          text: "Relational database ACID transactions cannot execute over TCP/IP connections.",
          isCorrect: false,
          whyWrong: "ACID transactions frequently run over TCP/IP; furthermore, CAP consistency refers to linearizability, not database ACID isolation.",
        },
        {
          id: "opt-1d",
          text: "Availability requires asynchronous replication, which permanently forbids reading recent writes.",
          isCorrect: false,
          whyWrong: "Asynchronous replication can still serve recent writes once synchronization packets arrive; CAP only forbids simultaneous guarantees during partitions.",
        },
      ],
      explanation: "Network partitions will inevitably occur in any physical network. When nodes cannot communicate, continuing to accept writes violates Consistency, while refusing requests violates Availability.",
      evidenceQuote: "Network partitions are physical realities of physics and networking. Network packets will be lost. Therefore, in the presence of a network partition, you are forced to make a trade-off: either you prioritize Consistency by rejecting writes on minority partitions, or you prioritize Availability by accepting writes on all partitions at the risk of returning stale or conflicting data.",
      evidenceSpan: { startChar: 1358, endChar: 1729 },
      bloomLevel: "understand",
    },
    {
      id: "q-2",
      conceptId: "c-5",
      questionType: "mcq",
      prompt: "In a cluster of 5 nodes running Paxos, what is the minimum quorum size required to accept a proposal?",
      correctAnswer: "3 nodes",
      options: [
        {
          id: "opt-2a",
          text: "3 nodes",
          isCorrect: true,
        },
        {
          id: "opt-2b",
          text: "2 nodes",
          isCorrect: false,
          whyWrong: "2 nodes is less than half of 5; two separate groups of 2 nodes could form without overlapping, causing split-brain.",
        },
        {
          id: "opt-2c",
          text: "4 nodes",
          isCorrect: false,
          whyWrong: "4 nodes is an excessive requirement that reduces fault tolerance; Paxos only requires a simple majority (floor(5/2) + 1 = 3).",
        },
        {
          id: "opt-2d",
          text: "5 nodes (unanimous)",
          isCorrect: false,
          whyWrong: "Unanimous agreement means a single failed node halts the entire system, completely sacrificing availability.",
        },
      ],
      explanation: "The quorum formula is floor(N/2) + 1. For N = 5, floor(5/2) + 1 = 2 + 1 = 3 nodes.",
      evidenceQuote: "A Quorum is defined as a strict majority of nodes, mathematically represented as floor of N over two plus one.",
      evidenceSpan: { startChar: 3465, endChar: 3600 },
      bloomLevel: "apply",
    },
    {
      id: "q-3",
      conceptId: "c-2",
      questionType: "true_false",
      prompt: "In Brewer's CAP Theorem, 'Consistency' refers to database ACID consistency (enforcing schema integrity constraints).",
      correctAnswer: "False",
      options: [
        {
          id: "opt-3a",
          text: "True",
          isCorrect: false,
          whyWrong: "ACID consistency is about preserving database invariants; CAP consistency specifically means linearizability.",
        },
        {
          id: "opt-3b",
          text: "False",
          isCorrect: true,
        },
      ],
      explanation: "In CAP, consistency specifically means linearizability: every read must receive the most recent write or an error.",
      evidenceQuote: "In the context of CAP, consistency does not mean database ACID consistency. It specifically means linearizability. Every read operation must receive the most recent write or an error.",
      evidenceSpan: { startChar: 885, endChar: 1070 },
      bloomLevel: "remember",
    },
  ],
};
