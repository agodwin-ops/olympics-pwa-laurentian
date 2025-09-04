import { GameboardEvent } from '@/types/olympics';

export const GAMEBOARD_INTRODUCTION = `
In this game, based roughly on the 1988 Calgary Olympics, Canada's first successful winter Olympic Games bid, your team will play the role of Canada's Chef de Mission. The Chef de Mission has a very important role for any Olympic Team. You must ensure that the coaches and athletes can smoothly navigate the Games environment and ultimately, you pave the way for athletes having personal best performances, increasing their chance of winning medals on the National stage. 

In this game, you will encounter many challenges related to planning, logistics, communications. How you win or lose each challenge will dictate how well Canadian athletes perform at these Olympic Games. Along the way, you can earn other special items that earn you points or gameboard moves.
`;

// Start position (everyone begins here)
export const START_POSITION = {
  id: 0,
  name: "Olympic Village Start",
  story: "Welcome to the 1988 Calgary Olympics! Your journey as Chef de Mission begins here.",
  challenge: "Start your Olympic adventure by exploring the venues.",
  requiredSkill: "Tactics" as const,
  successOutcome: {
    description: "Your Olympic journey begins!",
    xpReward: 0
  },
  failOutcome: {
    description: "Your Olympic journey begins!",
    xpReward: 0
  },
  position: { x: 5, y: 5 },
  connectsTo: [101] // Connect to first path towards station 1
};

// Main Olympic Event Stations (11 stations in linear order)
export const MAIN_STATIONS: GameboardEvent[] = [
  {
    id: 1,
    name: "Saddledome Stadium",
    story: "The Olympic Saddledome was the primary venue for ice hockey and figure skating. Located at Stampede Park, the facility was expected to cost $83 million but cost overruns pushed the facility to nearly $100 million. The organizing committee overpromised tickets to insiders and sponsors for seats to the premier Gold Medal Hockey game at the Saddledome. This is the first year that NHL players were allowed to play in the Olympics and Canada is a favourite to win the Gold medal against the dominating Soviet Union team.",
    challenge: "Politically you are pressured to find 2 tickets for Andy Moog, Canada's goaltender and 3-time Stanley Cup Champion. You get a lead that a major sponsor has tickets to give away but by the time you call they have already engaged Finland's Chef de Mission in a deal. You enter into a bidding war to get these tickets.",
    requiredSkill: "Strength",
    successOutcome: {
      description: "You win the bidding war and get the tickets.",
      xpReward: 750
    },
    failOutcome: {
      description: "You'll have to tell Andy Moog that his mom can't come to the game.",
      xpReward: 0
    },
    position: { x: 15, y: 15 },
    connectsTo: [0, 102] // Connect to start and path to station 2
  },
  {
    id: 2,
    name: "Nakiska Ski Venue",
    story: "There was a lot of controversy when Nakiska was awarded the contract for all downhill events. For many reasons, it was considered an inferior venue for an Olympic event. Apart from a not-very-technical course, the Nakiska ski area was notorious for having a lack of snow. The venue was banking on having a good snow year but just in case, a fleet of snow guns were brought in from the USA. When FIS inspects the course they think the base is too thin and wants to supplement with machine-made snow but other countries want to let the event go ahead with the subpar natural snow.",
    challenge: "As Chef, you know your athletes are used to racing on machine-made snow and will have an advantage. You put in an appeal the other countries' request to go ahead with the event on real snow.",
    requiredSkill: "Climbing",
    successOutcome: {
      description: "FIS uses the guns to make snow.",
      xpReward: 500
    },
    failOutcome: {
      description: "The race goes ahead on marginal snow base.",
      xpReward: 0
    },
    position: { x: 30, y: 25 },
    connectsTo: [105] // Connect to path to station 3
  },
  {
    id: 3,
    name: "Winsport",
    story: "The Winsport (now known as Canada Olympic Park) facility was built in Calgary to house bobsleigh, luge and the jumping events. The original park was built with 5 jumps ranging from K4-K90 ratings. The Canadian team has been training on these jumps for years. However, the Chinook winds have blown in just as the event is slated to start. There's a decent chance the winds might be too high for a safe jumping event. The Canadian team is prepped and ready to take the chairlift to the top of the course where the coach is waiting.",
    challenge: "As the Chef de Mission you're onsite at the venue to decide alongside the jury whether the event should go ahead or not based on the wind readings. You know your team is psychologically prepared to race and you want FIS to let the race go ahead. The other countries, led by a very vocal Austrian contingent are pushing FIS to delay the start.",
    requiredSkill: "Speed",
    successOutcome: {
      description: "FIS goes ahead with the race start.",
      xpReward: 750
    },
    failOutcome: {
      description: "The race is delayed. Canadian athletes suffer.",
      xpReward: 0
    },
    position: { x: 50, y: 15 },
    connectsTo: [109] // Connect to path to station 4
  },
  {
    id: 4,
    name: "Canmore Cross Country",
    story: "The cross country coach requires your assistance today to stand on course with a spare pole in case a Canadian breaks one in the mass start event of the 50km event.",
    challenge: "As you're standing on course, an Italian racer breaks a pole right in front of you. In that moment, you decide to give the Italian team the pole intended for the Canadians.",
    requiredSkill: "Endurance",
    successOutcome: {
      description: "You give the pole to the Italian and no Canadians need it.",
      xpReward: 750
    },
    failOutcome: {
      description: "You give the pole to the Italian and then a Canadian skis by with a broken pole.",
      xpReward: 0
    },
    position: { x: 75, y: 30 },
    connectsTo: [112] // Connect to path to station 5
  },
  {
    id: 5,
    name: "Olympic Oval Short Track",
    story: "Built specifically for the Olympics, the speed skating venue was located on the University of Calgary and was named the Olympic Oval. It was the first covered speed skating oval in North America, and offered superior climate control for ideal ice conditions. In the preliminary rounds of the short track event the ISU, speed skating's international federation observes very fast event times. They are concerned that the ice surface is not built to specifications.",
    challenge: "Knowing that the Canadian team is trained to skate well on this surface, you are arguing for an outcome that will leave the ice as built. An inspection team arrives to take measurements.",
    requiredSkill: "Speed",
    successOutcome: {
      description: "ISU finds the ice to be up to standard and the event goes ahead.",
      xpReward: 750
    },
    failOutcome: {
      description: "The ice is going to be torn up and modified to meet standards and Canadian team suffers.",
      xpReward: 0
    },
    position: { x: 85, y: 50 },
    connectsTo: [117] // Connect to path to station 6
  },
  {
    id: 6,
    name: "Canmore Biathlon",
    story: "The story at the biathlon centre is that the events have been dominated by 3 nations (USSR, East and West Germany). There is zero chance that Canadians will break the top 30 but the Nation always wants to rally around a relay event to cheer on their country. As the Chef de Mission, you know your appearance at the race site will provoke media questions about why Canada has such a dismal record in this sport.",
    challenge: "Staying away will ensure you don't have to answer difficult questions but the optics are bad if you show no support to the biathletes during these Olympics. You decide to skip the event.",
    requiredSkill: "Endurance",
    successOutcome: {
      description: "You skip the event, all the Canadians DNF and no one cares that you were missing.",
      xpReward: 500
    },
    failOutcome: {
      description: "A Canadian breaks through into a top10 position. It's a bad look that you missed it.",
      xpReward: 0
    },
    position: { x: 70, y: 65 },
    connectsTo: [121] // Connect to path to station 7
  },
  {
    id: 7,
    name: "Ski Jumping",
    story: "At the ski jumping venue, the winds are creating dangerous conditions for the athletes. The Canadian team has been training specifically for these conditions and believes they have an advantage if the competition proceeds as scheduled.",
    challenge: "As Chef de Mission, you must advocate for the safety of all athletes while considering Canada's competitive advantage. Do you push for the event to continue despite the risky conditions?",
    requiredSkill: "Speed",
    successOutcome: {
      description: "The event proceeds and Canadian athletes perform exceptionally well in the challenging conditions.",
      xpReward: 750
    },
    failOutcome: {
      description: "The event is delayed, and Canada loses their competitive edge when conditions normalize.",
      xpReward: 0
    },
    position: { x: 45, y: 70 },
    connectsTo: [124] // Connect to path to station 8
  },
  {
    id: 8,
    name: "Luge",
    story: "The East German team sweeps the women's luge single podium. There is a lot of chatter in the Athlete Village that there is doping in the East German team. Canada's medal hopeful finishes a disappointing 7th.",
    challenge: "The media contact you to do an interview on the rumours. Do you take the interview and risk having to acknowledge the rumours swirling around the Olympic Village?",
    requiredSkill: "Speed",
    successOutcome: {
      description: "You take a call to talk about the East German luge medal sweep and manage to put the spin of the article back on the Canadian Team.",
      xpReward: 500
    },
    failOutcome: {
      description: "The interview runs with the headline \"Doping in the Village\".",
      xpReward: 0
    },
    position: { x: 25, y: 60 },
    connectsTo: [128] // Connect to path to station 9
  },
  {
    id: 9,
    name: "Olympic Oval Long Track",
    story: "The covered ice combined with the high altitude in Calgary has led to the ice on the Olympic Oval being dubbed \"The Fastest Ice in the World\". So far, during the Olympics, 3 world records and 2 Olympic records have fallen. As the Chef de Mission, your presence at the Olympic Oval is in high demand to take interviews every time a record falls.",
    challenge: "You've spent too much time at the Olympic Oval and need to support some athletes in the snowboard competition but there's a good chance Canada will win the 5000m today against the Netherlands. Since the Netherlands have been skating better than expected, you decide to head to snowboarding instead.",
    requiredSkill: "Endurance",
    successOutcome: {
      description: "The Netherlands win and Canada disqualifies so no one missed you.",
      xpReward: 750
    },
    failOutcome: {
      description: "Canada disqualifies and you were needed to help them recover from that disappointment.",
      xpReward: 0
    },
    position: { x: 15, y: 45 },
    connectsTo: [131] // Connect to path to station 10
  },
  {
    id: 10,
    name: "Figure Skating",
    story: "The ongoing rivalry between American Brian Boitano and Canadian Brian Orser. Brian Orser won the silver medal at the 1984 Winter Olympics. Brian Boitano placed fifth. Orser placed second at the 1985 World Figure Skating Championships, with Boitano one step below him. Boitano won the next year. When Orser won the 1987 Worlds, held in Cincinnati, Boitano knew he would have to make a change in his skating if he were to beat Orser at the Calgary Olympics on Orser's home turf of Canada. Boitano was ahead after the compulsory figures, but Orser won the short program. At that time, figures counted for 30% of the score and the short program counted for 20%. The difference between Orser and Boitano was so small that the skater who won the long program would win the title. Orser won 4 judges' votes outright while Boitano won 3, two remaining judges that placed them with equal total mark gave Boitano higher technical mark, which was the tiebreaker.",
    challenge: "As the Chef de Mission, you are called to field an interview about the technicalities of this win. Do you take the call in this high-stakes American-Canadian rivalry or pass?",
    requiredSkill: "Strength",
    successOutcome: {
      description: "You take the interview and successfully petition to change the tiebreaking method that is so controversial.",
      xpReward: 500
    },
    failOutcome: {
      description: "The interview runs with the headline \"Canadian Ego Bruised\".",
      xpReward: 0
    },
    position: { x: 35, y: 35 },
    connectsTo: [135] // Connect to path to station 11
  },
  {
    id: 11,
    name: "McMahon Stadium",
    story: "Closing ceremony tickets were promised to all volunteers but the organizers quickly realized that there was more demand for seats than tickets. Volunteers who had no interest in seeing the closing ceremony found they could scalp their tickets at high prices at various venues around town in the last week of the Games.",
    challenge: "You need some tickets for a VIP guest so you head down to the Olympic Village to try and score some tickets. Will you be successful?",
    requiredSkill: "Strength",
    successOutcome: {
      description: "You get the tickets from the scalper.",
      xpReward: 500
    },
    failOutcome: {
      description: "You're short some tickets for the VIP guests.",
      xpReward: 0
    },
    position: { x: 70, y: 10 },
    connectsTo: [] // Final station
  }
];

// Intermediate Challenge Spots (between main stations)
export interface ChallengeSpot {
  id: number;
  name: string;
  story: string;
  challenge: string;
  requiredSkill: 'Tactics';
  position: { x: number; y: number };
  connectsTo: number[]; // IDs of stations/spots this connects to
}

export const CHALLENGE_SPOTS: ChallengeSpot[] = [
  // Path Start-1 (1 spot)
  { id: 101, name: "Snowy Trail", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 10, y: 10 }, connectsTo: [0, 1] },
  
  // Path 1-2 (3 spots)
  { id: 102, name: "Frozen Path", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 20, y: 18 }, connectsTo: [1, 103] },
  { id: 103, name: "Ice Bridge", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 25, y: 20 }, connectsTo: [102, 104] },
  { id: 104, name: "Maple Grove", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 28, y: 22 }, connectsTo: [103, 2] },
  
  // Path 2-3 (3 spots)
  { id: 105, name: "Mountain Trail", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 35, y: 22 }, connectsTo: [2, 106] },
  { id: 106, name: "Alpine Pass", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 40, y: 20 }, connectsTo: [105, 107] },
  { id: 107, name: "Ski Lodge", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 45, y: 18 }, connectsTo: [106, 3] },
  
  // Path 3-4 (3 spots)  
  { id: 109, name: "Rocky Ridge", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 58, y: 20 }, connectsTo: [3, 110] },
  { id: 110, name: "Wind Tunnel", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 65, y: 25 }, connectsTo: [109, 111] },
  { id: 111, name: "Jump Hill", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 70, y: 28 }, connectsTo: [110, 4] },
  
  // Path 4-5 (4 spots)
  { id: 112, name: "Forest Path", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 77, y: 35 }, connectsTo: [4, 113] },
  { id: 113, name: "Creek Crossing", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 79, y: 40 }, connectsTo: [112, 114] },
  { id: 114, name: "Nordic Trail", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 81, y: 45 }, connectsTo: [113, 115] },
  { id: 115, name: "Pine Grove", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 83, y: 48 }, connectsTo: [114, 5] },
  
  // Path 5-6 (3 spots)
  { id: 117, name: "Canyon Edge", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 78, y: 55 }, connectsTo: [5, 118] },
  { id: 118, name: "River Bend", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 75, y: 60 }, connectsTo: [117, 119] },
  { id: 119, name: "Target Range", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 72, y: 63 }, connectsTo: [118, 6] },
  
  // Path 6-7 (3 spots)
  { id: 121, name: "Valley Floor", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 60, y: 67 }, connectsTo: [6, 122] },
  { id: 122, name: "Ice Rink", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 52, y: 69 }, connectsTo: [121, 123] },
  { id: 123, name: "Speed Track", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 48, y: 70 }, connectsTo: [122, 7] },
  
  // Path 7-8 (3 spots)
  { id: 124, name: "Zamboni Path", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 38, y: 68 }, connectsTo: [7, 125] },
  { id: 125, name: "Locker Room", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 32, y: 65 }, connectsTo: [124, 126] },
  { id: 126, name: "Press Box", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 28, y: 62 }, connectsTo: [125, 8] },
  
  // Path 8-9 (2 spots)
  { id: 128, name: "Parking Lot", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 20, y: 55 }, connectsTo: [8, 129] },
  { id: 129, name: "Bus Stop", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 17, y: 50 }, connectsTo: [128, 9] },
  
  // Path 9-10 (4 spots)
  { id: 131, name: "Medal Plaza", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 20, y: 42 }, connectsTo: [9, 132] },
  { id: 132, name: "Athlete Village", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 25, y: 39 }, connectsTo: [131, 133] },
  { id: 133, name: "Media Center", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 30, y: 37 }, connectsTo: [132, 134] },
  { id: 134, name: "VIP Lounge", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 33, y: 36 }, connectsTo: [133, 10] },
  
  // Path 10-11 (3 spots)
  { id: 135, name: "Victory Lane", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 45, y: 30 }, connectsTo: [10, 136] },
  { id: 136, name: "Champion's Walk", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 55, y: 20 }, connectsTo: [135, 137] },
  { id: 137, name: "Olympic Flame", story: "Digging in the snow you found some loot.", challenge: "Tactic skill determines success in picking up special items (ie. Gatorade, Water Bottle, Skis, Toques).", requiredSkill: "Tactics", position: { x: 65, y: 12 }, connectsTo: [136, 11] }
];

// All events combined for backward compatibility
export const GAMEBOARD_EVENTS = MAIN_STATIONS;

// Special items that can be won through tactic challenges
export const SPECIAL_ITEMS: Array<{ name: string; icon: string; description: string }> = [
  { name: 'Gatorade', icon: '🥤', description: 'Energy drink for athletes' },
  { name: 'Water', icon: '💧', description: 'Essential hydration' },
  { name: 'Skis', icon: '🎿', description: 'Olympic skiing equipment' },
  { name: 'Toques', icon: '🧢', description: 'Warm winter headwear' }
];

// Skill level to success rate mapping
export const SKILL_SUCCESS_RATES: { [level: number]: { percentage: number; numbers: number } } = {
  1: { percentage: 20, numbers: 2 },
  2: { percentage: 40, numbers: 4 },
  3: { percentage: 50, numbers: 5 },
  4: { percentage: 70, numbers: 7 },
  5: { percentage: 90, numbers: 9 }
};