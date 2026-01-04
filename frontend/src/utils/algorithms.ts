/**
 * Algorithms Utility
 * Implementations of standard algorithms for string matching and more.
 * Inspired by TheAlgorithms/TypeScript repository.
 */

/**
 * Calculates the Levenshtein distance between two strings.
 * The Levenshtein distance is a string metric for measuring the difference between two sequences.
 * It is the minimum number of single-character edits (insertions, deletions or substitutions)
 * required to change one word into the other.
 *
 * @param a - The first string
 * @param b - The second string
 * @returns The Levenshtein distance
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          Math.min(
            matrix[i]![j - 1]! + 1, // insertion
            matrix[i - 1]![j]! + 1, // deletion
          ),
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
};

/**
 * Find the Longest Common Subsequence (LCS) of two strings.
 * @param text1 - The first input string.
 * @param text2 - The second input string.
 * @returns The longest common subsequence as a string.
 */
export const longestCommonSubsequence = (
  text1: string,
  text2: string,
): string => {
  const m = text1.length;
  const n = text2.length;

  // Create a 2D array to store the lengths of LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  // Fill in the DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Reconstruct the LCS from the DP table
  let i = m;
  let j = n;
  const lcs: string[] = [];
  while (i > 0 && j > 0) {
    if (text1[i - 1] === text2[j - 1]) {
      lcs.unshift(text1[i - 1]!);
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  return lcs.join("");
};

/**
 * Returns the Hamming distance between two strings of equal length
 * @param str1 One of the strings to compare
 * @param str2 One of the strings to compare
 * @returns The Hamming distance
 */
export const hammingDistance = (str1: string, str2: string): number => {
  if (str1.length !== str2.length) {
    throw new Error("Strings must be of the same length.");
  }

  let dist = 0;
  for (let i = 0; i < str1.length; i++) {
    if (str1[i] !== str2[i]) {
      dist++;
    }
  }

  return dist;
};
