/**
 * Game Logic for Beauty Contest (King of Diamonds)
 * Implements the core rules and calculations
 */

/**
 * Calculate the winning number (average × 0.8)
 */
export function calculateWinningNumber(choices) {
  const sum = choices.reduce((acc, choice) => acc + choice.number, 0);
  const average = sum / choices.length;
  const winningNumber = average * 0.8;
  return { average, winningNumber };
}

/**
 * Find the winner (closest to winning number)
 * Returns the player who wins the round
 */
export function findWinner(players, choices, winningNumber) {
  let closestPlayer = null;
  let closestDistance = Infinity;

  for (const choice of choices) {
    const distance = Math.abs(choice.number - winningNumber);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlayer = choice.userId;
    }
  }

  return closestPlayer;
}

/**
 * Check for duplicate numbers (Rule 1)
 * Returns array of userId who have duplicates
 */
export function checkDuplicates(choices) {
  const numberMap = new Map();
  const duplicates = [];

  for (const choice of choices) {
    if (numberMap.has(choice.number)) {
      duplicates.push(choice.userId);
      // Also mark the original duplicate
      if (!duplicates.includes(numberMap.get(choice.number))) {
        duplicates.push(numberMap.get(choice.number));
      }
    } else {
      numberMap.set(choice.number, choice.userId);
    }
  }

  return duplicates;
}

/**
 * Check if any choice is an exact match to winning number (Rule 2)
 */
export function checkExactMatch(choices, winningNumber) {
  return choices.some(choice => choice.number === winningNumber);
}

/**
 * Check for special win condition (Rule 3: 0 vs 100)
 * If anyone picks 0, the player who picked 100 wins automatically
 */
export function checkSpecialWin(choices) {
  const hasZero = choices.some(c => c.number === 0);
  const has100 = choices.some(c => c.number === 100);
  
  if (hasZero && has100) {
    const winner = choices.find(c => c.number === 100);
    return winner ? winner.userId : null;
  }
  
  return null;
}

/**
 * Apply score changes based on round results
 */
export function applyScoreChanges(players, winnerId, isExactMatch, activeRules) {
  const updates = {};
  const penalty = isExactMatch && activeRules.includes(2) ? -2 : -1;

  for (const player of players) {
    if (player.isEliminated) {
      updates[player.userId] = { scoreChange: 0, newScore: player.score };
      continue;
    }

    if (player.userId === winnerId) {
      updates[player.userId] = { 
        scoreChange: 1, 
        newScore: player.score + 1 
      };
    } else {
      updates[player.userId] = { 
        scoreChange: penalty, 
        newScore: player.score + penalty 
      };
    }
  }

  return updates;
}

/**
 * Check for eliminations (-10 points)
 * Returns array of eliminated player IDs
 */
export function checkEliminations(players) {
  const eliminated = [];
  
  for (const player of players) {
    if (!player.isEliminated && player.score <= -10) {
      eliminated.push(player.userId);
    }
  }
  
  return eliminated;
}

/**
 * Determine which rules should be unlocked
 * Rule 1: After 2 eliminations (duplicates invalid)
 * Rule 2: With Rule 1 (exact match = -2 penalty)
 * Rule 3: After 3 eliminations (0 vs 100 special)
 */
export function getActiveRules(eliminationCount) {
  const rules = [];
  
  if (eliminationCount >= 2) {
    rules.push(1); // Duplicates invalid
    rules.push(2); // Exact match doubles penalty
  }
  
  if (eliminationCount >= 3) {
    rules.push(3); // 0 vs 100 special win
  }
  
  return rules;
}

/**
 * Validate a player's choice based on active rules
 */
export function validateChoice(choice, allChoices, activeRules, userId) {
  // Basic validation
  if (choice < 0 || choice > 100) {
    return { valid: false, reason: 'Number must be between 0 and 100' };
  }

  // Rule 1: Check for duplicates
  if (activeRules.includes(1)) {
    const duplicate = allChoices.find(
      c => c.number === choice && c.userId !== userId
    );
    if (duplicate) {
      return { valid: false, reason: 'Duplicate numbers are invalid (Rule 1)' };
    }
  }

  return { valid: true };
}

/**
 * Check if game is over (only 1 player remaining)
 */
export function isGameOver(players) {
  const activePlayers = players.filter(p => !p.isEliminated);
  return activePlayers.length <= 1;
}

/**
 * Get final standings (sorted by score, highest first)
 */
export function getFinalStandings(players) {
  return [...players].sort((a, b) => b.score - a.score);
}

