// All dialogue and player-facing text, in one place, so it can be edited
// without touching game logic. Each dialogue line is { speaker, text }, where
// speaker is 'zeus', 'hercules' or 'oracle'. Functions receive run stats.
//
// Tone: the story speaks in myth (coins, fate, blessings). The quantum
// vocabulary appears only in the Oracle's lesson ("Quantum view" notes), the
// Learn More pages and the results screen, so players can connect the two.

const line = (speaker, text) => ({ speaker, text });
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const DIALOGUE = {
  intro: [
    line('zeus', 'Hercules. I need your help.'),
    line('zeus', 'Last night Hermes stole my lightning bolt. He has hidden it somewhere inside the Temple of Apollo, up there above the hill.'),
    line('hercules', 'Hermes? Why would he do that?'),
    line('zeus', 'To prove that he could, I expect. The reason doesn\'t matter. I need the bolt back, and soon.'),
    line('zeus', 'The temple is kept by the Oracle of Delphi. She lets no one in without an offering.'),
    line('zeus', 'Take an offering from the pile, climb up to the temple, and find the bolt. I\'m counting on you.'),
    line('hercules', 'I\'ll bring it back, Father.'),
  ],

  firstVisitEnter: [
    line('oracle', 'Welcome, son of Zeus. I accept your offering.'),
    line('hercules', 'Sixty-four pots. Hermes must have hidden the bolt in one of them.'),
    line('oracle', 'Each offering lets you open one pot. Choose.'),
  ],
  firstVisitEmpty: [
    line('hercules', 'Nothing. Just dust.'),
    line('oracle', 'To open another pot, you\'ll need another offering. The pile is at the foot of the hill.'),
  ],

  secondVisitEnter: [
    line('oracle', 'You\'re back. You\'ll have noticed the path has changed. It never stays the same for long.'),
    line('oracle', 'One offering, one pot.'),
    line('hercules', 'This one feels right.'),
  ],
  secondVisitEmpty: [
    line('hercules', 'Empty again.'),
    line('hercules', 'There has to be a faster way than this.'),
    line('oracle', 'There is. Bring me one more offering, and I\'ll show you.'),
  ],

  oracleIntro: [
    line('oracle', 'Before you choose, sit with me a moment.'),
    line('hercules', 'One pot for every climb. With sixty-two pots left, I could be at this for weeks.'),
    line('hercules', 'All I have with me are these six gold coins. Each one lands on chi or omicron, X or O.'),
    line('hercules', 'Six coins can land in sixty-four different ways. The same as the number of pots.'),
    line('oracle', 'That\'s no coincidence. Here in Apollo\'s temple, the coins don\'t fall by chance alone. I can tilt the odds of how they land.'),
    line('oracle', 'Let me show you how it works.'),
  ],
  oracleAfterTutorial: [
    line('oracle', 'From now on, each offering buys one of two things. I can bless the coins, which tilts the odds a little further toward the bolt\'s pot...'),
    line('oracle', '...or you can toss the coins and open the pot they name.'),
    line('oracle', 'Toss too early and they land almost at random. Wait too long and the blessings overshoot, and the odds start to fall again. With sixty-four pots, about six blessings is right.'),
    line('oracle', 'One more thing. Once the coins have landed, the result is fixed. If they name an empty pot, every blessing is lost and we start again.'),
    line('hercules', 'And every blessing still costs a climb?'),
    line('oracle', 'It does. You\'ve just brought an offering, so this first choice is already paid for. What will it be?'),
  ],

  // One is picked at random each time Hercules arrives during the search.
  oracleGreetings: [
    [line('oracle', 'Another offering. Shall I bless the coins, or will you toss them?')],
    [line('oracle', 'Welcome back. What will it be?')],
    [line('oracle', 'The pots are waiting. Bless, or toss?')],
    [line('hercules', 'Back again.'), line('oracle', 'Bless the coins, or toss them?')],
    [line('oracle', 'I\'m ready when you are.')],
  ],

  afterBlessing: [
    line('oracle', 'It\'s done. The odds have shifted a little further. Go and fetch another offering.'),
  ],

  tossFoundBrokenPot: (pot) => [
    line('hercules', `Pot ${pot}? I\'ve already broken that one.`),
    line('oracle', 'The coins don\'t know that. They\'ve landed all the same, and the blessings are spent.'),
  ],

  collapseExplained: [
    line('oracle', 'Empty. Once the coins land, the result is fixed, and the blessings I built up are gone.'),
    line('oracle', 'We\'re back to even odds. Every pot is as likely as any other, so the blessings have to be built up again from the start.'),
  ],
  collapseShort: [
    line('oracle', 'Empty. We\'re back to even odds.'),
  ],

  boltFound: [
    line('hercules', 'There it is. Father\'s lightning bolt.'),
  ],
  zeusArrives: [
    line('zeus', 'You found it.'),
  ],

  oracleSummary: (s) => {
    const lines = [
      line('oracle', `Since I showed you my way, you\'ve spent ${plural(s.mainActions, 'offering')}: ${plural(s.groverIterations, 'blessing')} and ${plural(s.mainPots, 'toss', 'tosses')} of the coins.`),
      line('oracle', 'Opening pots one at a time takes about 32 offerings on average, and as many as 63. With blessings, it takes about seven: six blessings and one toss.'),
    ];
    const saved = 32 - s.mainActions;
    if (saved > 0) {
      lines.push(line('oracle', `That saved you about ${plural(saved, 'climb')} compared with guessing, and ${63 - s.mainActions} compared with the worst case.`));
    } else {
      lines.push(line('oracle', 'This time it took as long as guessing would have. Knowing when to toss makes all the difference.'));
    }
    return lines;
  },

  zeusVerdict: {
    pleased: [
      line('zeus', 'Quickly done, and cleverly too. Well done, my son.'),
      line('zeus', 'Hermes will think twice before he tries that again. Thank you, Hercules.'),
    ],
    neutral: [
      line('zeus', 'You found it, though it took longer than I hoped.'),
      line('zeus', 'Next time, trust the Oracle sooner. Her way is faster.'),
    ],
    angry: [
      line('zeus', 'Finally. Do you know how long I\'ve been waiting?'),
      line('zeus', 'The Oracle showed you a faster way, and you didn\'t use it. Next time, listen to her.'),
    ],
  },
};

export const TEXT = {
  title: 'Oracle\'s Assistance',
  play: 'Play',
  clickToBegin: 'Click anywhere to begin',
  titleHint: 'A / D or ← / → to move · Space / W / ↑ to jump · E to interact',

  options: {
    button: 'Options',
    title: 'Options',
    resume: 'Resume',
    learn: 'Grover\'s Algorithm',
    music: (on) => `Music: ${on ? 'On' : 'Off'}`,
    sound: (on) => `Sounds: ${on ? 'On' : 'Off'}`,
    restart: 'Restart Run',
    menu: 'Main Menu',
    fullscreen: 'Fullscreen (F)',
    hint: 'Esc to resume',
    confirmRestart: 'Start the whole run again from the beginning? All progress will be lost.',
    confirmMenu: 'Leave this run and return to the title screen? All progress will be lost.',
    yesRestart: 'Yes, restart',
    yesMenu: 'Yes, leave',
    cancel: 'Cancel',
  },

  hud: {
    offeringYes: 'Offering: carried',
    offeringNo: 'Offering: none',
    actions: 'Offerings spent',
    pots: 'Pots opened',
    grover: 'Blessings',
    explain: 'Grover Explanation',
  },

  objective: {
    getOffering: 'Take an offering from the pile (E)',
    climb: 'Climb to the Temple of Apollo',
    choosePot: 'Choose a pot to open',
  },

  prompt: {
    takeOffering: 'Take an offering',
    carrying: 'Already carrying one',
  },

  toast: {
    pickedUp: 'You take an offering.',
    alreadyCarrying: 'You can only carry one offering at a time.',
    needOffering: 'The temple is sealed. Bring an offering from the pile below.',
    consumed: 'Your offering is consumed as you enter the temple.',
    checkpoint: 'Checkpoint reached',
    respawn: 'Back to the last checkpoint',
    empty: 'Empty!',
    found: 'The lightning bolt!',
    adapterError: 'The Oracle\'s vision is clouded (an error occurred). Trying again...',
  },

  potGrid: {
    title: 'Choose a pot to open',
    hover: (i, pattern) => `Pot ${i}  ·  the coins that name it: ${pattern}`,
    hoverNone: 'Hover over a pot to see its number and the coin pattern that names it',
    broken: (i) => `Pot ${i} is already broken`,
    cancel: 'Cancel (Esc)',
  },

  oracle: {
    title: 'The Oracle\'s Vision',
    explain: 'The coins\' probability amplitudes on the Oracle\'s scroll. Each bar is one of the 64 ways your coins can fall. The Oracle sees the amplitudes, but not which pot each bar belongs to.',
    run: (n) => `Blessings since the coins last fell: ${n}`,
    odds: (p) => `Chance the coins name the bolt's pot: ${(p * 100).toFixed(1)}%`,
    ask: 'Ask for a blessing',
    toss: 'Toss the coins',
    cost: 'Either choice spends this offering. Then it is back down the hill.',
    consulting: 'The Oracle is consulting',
    marking: 'The Oracle marks the bolt\'s pot...',
    reflecting: '...and reflects fate about its average.',
    blessed: (n) => `Blessing ${n} complete.`,
    descend: 'Return down the hill',
    note: 'Quantum view: each Grover iteration is represented as taking one blessing from the Oracle of Delphi. Real hardware never shows these bars; the final circuit is measured to estimate the probability distribution.',
  },

  toss: {
    title: 'Fate Decides',
    spinning: 'The coins spin...',
    result: (pattern, pot) => `${pattern}  →  the coins name pot ${pot}`,
    open: (pot) => `Open pot ${pot}`,
  },

  // Quantum explanations are taken from the project write-up on Qollab
  // (docs/qollab-project-page.txt), so the game and the write-up agree.
  tutorial: {
    header: 'The Oracle\'s Lesson',
    next: 'Next',
    back: 'Back',
    finish: 'Finish',
    close: 'Close (Esc)',
    learnMore: 'Learn more',
    stages: [
      {
        title: '1 · Six Coins, Sixty-Four Pots',
        body: 'Each time Hercules tosses his six coins, he gets a unique series of six X\'s and O\'s that correspond to exactly one of the pots. The first three coins pick the row and the last three pick the column. Click the coins.',
        note: 'Quantum view: each outcome (pot) corresponds to a six-bit binary string. Six qubits have 64 computational basis states because 2⁶ = 64.',
      },
      {
        title: '2 · Even Odds',
        body: 'Each bar is one outcome, and its height is that outcome\'s probability amplitude. For the algorithm, the six qubits begin in the state |000000>, so one outcome is certain. A Hadamard gate is applied to each qubit, producing an equal superposition of all 64 basis states.',
        after: 'Initially, every pot has the same measurement probability: 1/64, or 1.5625%. This is represented in the game by the initially fair state of the six coins.',
        button: 'Hadamard to all coins',
        note: 'Quantum view: each coin having a 50/50 chance of landing either X or O makes the distribution of all possible outcomes completely uniform, as does the all-qubit Hadamard.',
      },
      {
        title: '3 · The Oracle\'s Mark',
        body: 'The Grover oracle recognizes the marked state and changes its phase by multiplying its amplitude by −1.',
        after: 'This doesn\'t change the probability yet, only the probability amplitude, but this difference will be exploited to change the amplitudes markedly.',
        button: 'Mark the bolt\'s pot',
        note: 'Quantum view: O|x> = (−1)^f(x) |x>. Here, f(x) = 1 for the marked state and 0 otherwise.',
      },
      {
        title: '4 · Bending Fate',
        body: 'After the oracle marks the target, the diffusion operator reflects the amplitudes about their mean (the dashed line). This amplifies the probability amplitude of the marked state while decreasing those of the other states.',
        after: (k, p) => `After ${plural(k, 'blessing')}, the probability of the bolt's pot is ${(p * 100).toFixed(1)}%.` + (k > 6 ? ' Any more than six will begin to lower the probability.' : k === 6 ? ' Six iterations provide the optimal integer iteration count for this search.' : ''),
        button: 'One blessing',
        reset: 'Reset',
        note: 'Quantum view: together, the oracle and diffusion operator constitute one Grover iteration. Each Grover iteration is represented as taking one blessing from the Oracle of Delphi.',
      },
    ],
    readout: (pattern, dec) => `${pattern}  →  Pot ${dec}`,
    probLabel: 'Probability of the bolt\'s pot, by blessing',
    probUniform: (a0, a1) => `000000: amplitude ${a0.toFixed(3)}  ·  every other outcome: amplitude ${a1.toFixed(3)}, probability ${(a1 ** 2 * 100).toFixed(2)}%`,
    probMarked: (a, p) => `Bolt's pot (gold): amplitude ${a.toFixed(3)}, probability ${(p * 100).toFixed(1)}%`,
  },

  // The Grover guide: an interactive explainer reached from the lesson, the
  // altar, Options and the results screen. Each topic has text, an optional
  // detail page (`more`), a hands-on demo, and a note tying it to the game.
  // In text lists, a string is a paragraph and { math } is a formula line.
  guide: {
    header: 'Grover\'s Algorithm',
    close: 'Close (Esc)',
    backToResults: 'Back',
    playAgain: 'Play Again',
    menu: 'Main Menu',
    inGame: 'In the game',
    showMore: 'More detail',
    showDemo: 'Back to demo',
    topics: [
      {
        title: 'The Search Problem',
        demo: 'classical',
        text: [
          'Grover\'s algorithm (also called quantum search) was introduced by Lov Grover in 1996, and is a quantum algorithm for searching an unstructured collection of possibilities.',
          'A classical linear search generally requires a number of queries proportional to the size of the search space, written as O(N). The average is usually (N + 1)/2, and the maximum in the worst case is N − 1. Grover\'s algorithm can find a marked item with high probability using O(√N) quantum oracle queries. For this game, N = 64 (64 pots), requiring six qubits (six coins).',
        ],
        game: 'At first, Hercules makes the climb to begin checking the pots one by one, but each opportunity to check a pot requires an offering to the Oracle, and Hercules can only carry one offering up to the temple at a time. This strongly emphasizes the need for better search efficiency.',
      },
      {
        title: 'The Search Space',
        demo: 'coins',
        text: [
          'Each outcome (pot) corresponds to a six-bit binary string. The 64 item list containing each of these unique bit strings is the computational basis.',
          { math: 'Six qubits have 64 computational basis states because 2⁶ = 64.' },
        ],
        game: 'Each time Hercules tosses his six coins, he gets a unique series of six X\'s and O\'s that correspond to exactly one of the pots. Try it: click the coins.',
      },
      {
        title: 'Initializing Superposition',
        demo: 'hadamard',
        text: [
          'As opposed to classical bits, qubits can produce a state with a superposition between all these possible outcome computational basis states. For the algorithm, the six qubits begin in the state |000000>. A Hadamard gate is applied to each qubit, producing an equal superposition of all 64 basis states:',
          { math: '|ψ>  =  (1/8) Σ |x>,    summed over x = 0 to 63' },
          'Initially, every pot has the same measurement probability: 1/64, or 1.5625%.',
        ],
        game: 'This is represented in the game by the initially fair state of the six coins. Each coin having a 50/50 chance of landing either X or O makes the distribution of all possible outcomes completely uniform, as does the all-qubit Hadamard.',
      },
      {
        title: 'The Grover Oracle',
        demo: 'oracle',
        text: [
          'The Grover oracle recognizes the marked state and changes its phase by multiplying its amplitude by −1. This doesn\'t change the probability yet, only the probability amplitude, but this difference will be exploited to change the amplitudes markedly.',
          { math: 'O|x>  =  (−1)^f(x) |x>' },
          'Here, f(x) = 1 for the marked state and 0 otherwise.',
        ],
        game: 'Each blessing begins with the Oracle\'s mark: she "inverts the weighting of the coins". In her vision, the bolt\'s bar flips below the line, but the chance of the toss stays the same.',
      },
      {
        title: 'Amplitude Amplification',
        demo: 'diffusion',
        text: [
          'After the oracle marks the target, the diffusion operator reflects the amplitudes about their mean. This amplifies the probability amplitude of the marked state while decreasing those of the other states, which markedly increases the actual probability of the marked state.',
          'Together, the oracle and diffusion operator constitute one Grover iteration. As they iterate up until the optimal level, the probability of measuring the correct state continues increasing up until near 100%.',
        ],
        more: [
          { math: 'D  =  H⁶ (2|000000><000000| − I) H⁶,    where H⁶ is a Hadamard on all six qubits' },
          'This applies another Hadamard to the uniform superposition (with the inverted phase for the marked state) to collapse the state back down (although it is still in superposition), capitalizing on interference to encode the mean of all amplitudes into the amplitude of the all 0 state.',
          'Phases of all other amplitudes are then flipped except the all zero state, before another all-qubit Hadamard is applied. This expands back to the size of the original superposition, with amplitudes now flipped over the mean.',
        ],
        game: 'Each Grover iteration is represented as taking one blessing from the Oracle of Delphi. She "inverts the weighting of the coins" and then performs her alterations to invert the amplitudes, as is shown by a visual in-game.',
      },
      {
        title: 'The Optimal Iteration Count',
        tab: 'Optimal Iterations',
        demo: 'iterations',
        text: [
          'For one marked state among 64 possibilities, the ideal probability of success after k Grover iterations is:',
          { math: 'P(k)  =  sin²( (2k + 1) · arcsin(1/8) )' },
          'Six iterations provide the optimal integer iteration count for this particular search, while any more will begin to lower the probability.',
        ],
        more: [
          'In the context of the game, the search produces the following theoretical results:',
          { math: '0 iterations: 1.56%      1: 13.48%      3: 59.14%      5: 96.35%' },
          { math: '6 iterations: 99.66%      7: 90.74%      10: 23.81%' },
          'None: uniform distribution of outcomes. Limited: higher probability of successful state selection (although not highest). Optimal: initial maximum of the successful state selection probability. Overshot: reduced probability of successful state selection (can be reduced anywhere from minimally, to back to uniform, to below uniform).',
        ],
        game: 'If Hercules takes too many blessings, his chances of success on the coin toss will actually begin to come back down. The player receives advice as to the optimal stopping point, but is given the option to continue, and can observe the lowering of the probability.',
      },
      {
        title: 'Measurement',
        demo: 'measure',
        text: [
          'After the desired number of iterations, the state is measured in the computational basis. The state collapses according to the probability amplitudes of each basis state, and the correct outcome is achieved with high probability.',
        ],
        game: 'In-game, Hercules will toss his coins, expend all the blessings, and smash the pot the coins tell him to smash. Whenever he throws the coins, the blessings are expended and they return back to their fair, 50/50 status.',
      },
      {
        title: 'Quantum Advantage',
        demo: 'advantage',
        text: [
          'A classical linear search needs about (N + 1)/2 queries on average and N − 1 in the worst case, while Grover\'s algorithm needs O(√N) oracle queries.',
          'This comparison of oracle queries with traditional search queries is not perfect, with each type of query consuming different amounts of computing time and power. However, it serves as a relatively accurate estimate, especially as search spaces get larger.',
        ],
        game: 'The six-qubit, 64-outcome search space in this game is deliberately small enough to visualize and simulate efficiently. This makes it useful for education, but not as a demonstration of practical computational advantage.',
      },
      {
        title: 'Our Quantum Implementation',
        tab: 'Our Implementation',
        demo: null,
        text: [
          'The project includes a corresponding six-qubit Qiskit implementation of Grover\'s algorithm hosted on Qollab, alongside the independently runnable browser-based game. The quantum implementation consists of:',
          '•  Target selection: a six-bit state is selected as the search target and remains unchanged for the duration of a single experiment.\n•  State preparation: Hadamard gates prepare a uniform superposition across all 64 possible states.\n•  Phase oracle: a marked-state phase operation distinguishes the target from the unmarked states.\n•  Diffusion operator: a reflection about the uniform superposition amplifies the marked state\'s amplitude.\n•  Measurement: the final circuit is measured to estimate the probability distribution across all 64 possible outcomes.',
          'The browser game uses its own ideal simulation of the six-qubit search to provide immediate feedback and visualizations during gameplay. The ideal probability predictions do not factor in noise, so slight differences can be observed between the game and the algorithm on real quantum hardware, especially for larger, deeper circuits.',
        ],
        game: 'To run the Qiskit version, open the Code tab of this project on Qollab (qollab.xyz) and select Run Project. Vary the number of Grover iterations and compare the outcomes with the theoretical probability curve.',
      },
    ],
    // Labels for the hands-on demos.
    classical: {
      opened: (n) => `Pots opened: ${n}`,
      found: (n) => `Found the bolt after opening ${plural(n, 'pot')}.`,
      hint: 'Click pots to search them one by one.',
      reset: 'Hide it again',
    },
    coins: { readout: (pattern, pot) => `${pattern}  →  pot ${pot}` },
    hadamard: {
      apply: 'Hadamard on all coins',
      reset: 'Reset to |000000>',
      before: 'One outcome has amplitude 1, so the measurement is certain.',
      after: 'All 64 amplitudes are 1/8 = 0.125, so each probability is 1/64 = 1.5625%.',
    },
    oracle: {
      mark: 'Apply the oracle',
      readout: (a) => `Marked amplitude: ${a.toFixed(3)}     Probability: ${(a * a * 100).toFixed(2)}%`,
    },
    diffusion: {
      mark: 'Oracle (mark)',
      reflect: 'Diffusion (reflect)',
      reset: 'Reset',
      readout: (k, p) => `Grover iterations: ${k}     Probability of the marked state: ${(p * 100).toFixed(1)}%`,
    },
    iterations: {
      readout: (k, p) => `k = ${k}     P(k) = ${(p * 100).toFixed(2)}%`,
      plot: 'P(k), k = 0 to 12',
    },
    measure: {
      once: 'Measure once',
      many: 'Measure 100 times',
      k: (k) => `Iterations: ${k}`,
      result: (pattern, pot, hit) => `Measured ${pattern} (pot ${pot}): ${hit ? 'the marked state!' : 'not the marked state.'}`,
      tally: (hits, n) => `The marked state came up ${hits} times out of ${n}.`,
      hint: 'Choose a number of iterations, then measure.',
    },
    advantage: {
      qubits: (n, N) => `${n} qubits  =  ${N.toLocaleString('en-US')} possibilities`,
      avg: 'Classical, average',
      worst: 'Classical, worst case',
      grover: 'Grover iterations',
      scale: 'Bar lengths use a logarithmic scale.',
    },
  },

  results: {
    title: 'The Bolt Is Returned',
    chartTitle: 'Offerings needed to find the bolt',
    bars: {
      you: 'Your run',
      grover: 'Grover, average',
      avg: 'Classical, average',
      worst: 'Classical, worst',
    },
    notes: { you: 'after the lesson', grover: '6 blessings + 1 toss', avg: '(N + 1) / 2', worst: 'N − 1' },
    verdictCaption: { pleased: 'Zeus is pleased', neutral: 'Zeus is impatient', angry: 'Zeus is angry' },
    learn: 'Learn more about Grover\'s',
  },
};
