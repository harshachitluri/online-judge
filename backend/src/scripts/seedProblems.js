const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/../../.env" });

const Problem = require("../models/Problem");
const TestCase = require("../models/TestCase");
const User = require("../models/User");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

/*
|--------------------------------------------------------------------------
| Seed Script — 50+ Curated DSA Problems
|--------------------------------------------------------------------------
| Topics: Arrays, Strings, Hashing, Sorting, Binary Search, Linked Lists,
|         Trees, Graphs, Dynamic Programming, Bit Manipulation, Tries,
|         Stack & Queue
|
| Each problem includes:
|   - Full description, constraints, examples
|   - Starter code for C++, Java, Python
|   - 2-5 test cases (sample + hidden)
|   - Tags, difficulty, company associations, topicCategory
*/

const PROBLEMS = [
    // ═══════════════════════════════════════════════════════════════
    // ARRAYS (5 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Two Sum",
        slug: "two-sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nInput format: First line contains the array separated by spaces. Second line contains the target.\nOutput format: Print the two indices separated by a space.",
        difficulty: "Easy",
        tags: ["Array", "Hash Table"],
        functionName: "twoSum",
        constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
        topicCategory: "Arrays",
        company: ["Google", "Amazon", "Meta", "Microsoft"],
        testCases: [
            { input: "2 7 11 15\n9", expectedOutput: "0 1", isSample: true, explanation: "Because nums[0] + nums[1] == 9, we return 0 1." },
            { input: "3 2 4\n6", expectedOutput: "1 2", isSample: true, explanation: "Because nums[1] + nums[2] == 6, we return 1 2." },
            { input: "3 3\n6", expectedOutput: "0 1", isSample: false },
            // 7 + 2 = 9 → indices 3 and 4 (the old "1 3" claimed 5 + 7 = 9)
            { input: "1 5 3 7 2\n9", expectedOutput: "3 4", isSample: false }
        ]
    },
    {
        title: "Contains Duplicate",
        slug: "contains-duplicate",
        description: "Given an integer array nums, return true if any value appears at least twice in the array, and false if every element is distinct.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print true or false.",
        difficulty: "Easy",
        tags: ["Array", "Hash Table", "Sorting"],
        functionName: "containsDuplicate",
        constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
        topicCategory: "Arrays",
        company: ["Amazon", "Apple", "Microsoft"],
        testCases: [
            { input: "1 2 3 1", expectedOutput: "true", isSample: true, explanation: "The element 1 appears at index 0 and 3." },
            { input: "1 2 3 4", expectedOutput: "false", isSample: true, explanation: "All elements are distinct." },
            { input: "1 1 1 3 3 4 3 2 4 2", expectedOutput: "true", isSample: false },
            { input: "7", expectedOutput: "false", isSample: false }
        ]
    },
    {
        title: "Best Time to Buy and Sell Stock",
        slug: "best-time-to-buy-and-sell-stock",
        description: "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.\n\nInput format: A single line containing prices separated by spaces.\nOutput format: Print the maximum profit.",
        difficulty: "Easy",
        tags: ["Array", "Dynamic Programming"],
        functionName: "maxProfit",
        constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
        topicCategory: "Arrays",
        company: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
        testCases: [
            { input: "7 1 5 3 6 4", expectedOutput: "5", isSample: true, explanation: "Buy on day 2 (price=1), sell on day 5 (price=6), profit = 5." },
            { input: "7 6 4 3 1", expectedOutput: "0", isSample: true, explanation: "No profitable transaction possible." },
            { input: "2 4 1", expectedOutput: "2", isSample: false },
            { input: "1 2", expectedOutput: "1", isSample: false }
        ]
    },
    {
        title: "Product of Array Except Self",
        slug: "product-of-array-except-self",
        description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\n\nYou must solve it without using division and in O(n) time.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the result array separated by spaces.",
        difficulty: "Medium",
        tags: ["Array", "Prefix Sum"],
        functionName: "productExceptSelf",
        constraints: "2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix or suffix of nums fits in a 32-bit integer.",
        topicCategory: "Arrays",
        company: ["Amazon", "Meta", "Apple", "Microsoft"],
        testCases: [
            { input: "1 2 3 4", expectedOutput: "24 12 8 6", isSample: true, explanation: "For index 0: 2*3*4=24, for index 1: 1*3*4=12, etc." },
            { input: "-1 1 0 -3 3", expectedOutput: "0 0 9 0 0", isSample: true },
            { input: "2 3", expectedOutput: "3 2", isSample: false },
            { input: "1 1 1 1", expectedOutput: "1 1 1 1", isSample: false }
        ]
    },
    {
        title: "Maximum Subarray",
        slug: "maximum-subarray",
        description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the maximum subarray sum.",
        difficulty: "Medium",
        tags: ["Array", "Dynamic Programming", "Divide and Conquer"],
        functionName: "maxSubArray",
        constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        topicCategory: "Arrays",
        company: ["Google", "Amazon", "Microsoft", "Apple"],
        testCases: [
            { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isSample: true, explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
            { input: "1", expectedOutput: "1", isSample: true },
            { input: "5 4 -1 7 8", expectedOutput: "23", isSample: false },
            { input: "-1 -2 -3", expectedOutput: "-1", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // STRINGS (4 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Valid Palindrome",
        slug: "valid-palindrome",
        description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.\n\nInput format: A single line containing the string.\nOutput format: Print true or false.",
        difficulty: "Easy",
        tags: ["String", "Two Pointers"],
        functionName: "isPalindrome",
        constraints: "1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.",
        topicCategory: "Strings",
        company: ["Meta", "Microsoft"],
        testCases: [
            { input: "A man, a plan, a canal: Panama", expectedOutput: "true", isSample: true, explanation: "After removing non-alphanumeric: 'amanaplanacanalpanama' is a palindrome." },
            { input: "race a car", expectedOutput: "false", isSample: true },
            { input: " ", expectedOutput: "true", isSample: false },
            { input: "ab", expectedOutput: "false", isSample: false }
        ]
    },
    {
        title: "Reverse String",
        slug: "reverse-string",
        description: "Write a function that reverses a string. The input string is given as a single line on standard input.\n\nYou must print the reversed string to standard output.",
        difficulty: "Easy",
        tags: ["String", "Two Pointers"],
        functionName: "reverseString",
        constraints: "1 <= s.length <= 10^5\ns[i] is a printable ASCII character.",
        topicCategory: "Strings",
        company: ["Amazon", "Microsoft"],
        testCases: [
            { input: "hello", expectedOutput: "olleh", isSample: true, explanation: "The string 'hello' reversed is 'olleh'." },
            { input: "CodeJudge", expectedOutput: "egduJedoC", isSample: true, explanation: "Capitalization must be preserved." },
            { input: "a", expectedOutput: "a", isSample: false },
            { input: "abcdef", expectedOutput: "fedcba", isSample: false }
        ]
    },
    {
        title: "Valid Anagram",
        slug: "valid-anagram",
        description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn anagram is a word formed by rearranging the letters of a different word, using all the original letters exactly once.\n\nInput format: First line contains string s. Second line contains string t.\nOutput format: Print true or false.",
        difficulty: "Easy",
        tags: ["String", "Hash Table", "Sorting"],
        functionName: "isAnagram",
        constraints: "1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.",
        topicCategory: "Strings",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "anagram\nnagaram", expectedOutput: "true", isSample: true, explanation: "'nagaram' is an anagram of 'anagram'." },
            { input: "rat\ncar", expectedOutput: "false", isSample: true },
            { input: "a\na", expectedOutput: "true", isSample: false },
            { input: "ab\nba", expectedOutput: "true", isSample: false }
        ]
    },
    {
        title: "Longest Common Prefix",
        slug: "longest-common-prefix",
        description: "Write a function to find the longest common prefix string amongst an array of strings.\n\nIf there is no common prefix, return an empty string \"\".\n\nInput format: Multiple lines, each containing one string.\nOutput format: Print the longest common prefix (or empty line if none).",
        difficulty: "Easy",
        tags: ["String", "Trie"],
        functionName: "longestCommonPrefix",
        constraints: "1 <= strs.length <= 200\n0 <= strs[i].length <= 200\nstrs[i] consists of only lowercase English letters.",
        topicCategory: "Strings",
        company: ["Google", "Amazon"],
        testCases: [
            { input: "flower\nflow\nflight", expectedOutput: "fl", isSample: true, explanation: "The longest common prefix is 'fl'." },
            { input: "dog\nracecar\ncar", expectedOutput: "", isSample: true, explanation: "There is no common prefix." },
            { input: "abc\nabc\nabc", expectedOutput: "abc", isSample: false },
            { input: "a", expectedOutput: "a", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // HASHING (4 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Group Anagrams",
        slug: "group-anagrams",
        description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.\n\nInput format: First line contains N (number of strings). Second line contains the N strings separated by spaces.\nOutput format: Print each group on a separate line, words separated by spaces, groups sorted alphabetically by their first word.",
        difficulty: "Medium",
        tags: ["Hash Table", "String", "Sorting"],
        functionName: "groupAnagrams",
        constraints: "1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.",
        topicCategory: "Hashing",
        company: ["Amazon", "Google", "Meta"],
        testCases: [
            { input: "6\neat tea tan ate nat bat", expectedOutput: "ate eat tea\nbat\nnat tan", isSample: true },
            { input: "1\na", expectedOutput: "a", isSample: true },
            { input: "1\n", expectedOutput: "", isSample: false }
        ]
    },
    {
        title: "Longest Consecutive Sequence",
        slug: "longest-consecutive-sequence",
        description: "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.\n\nYou must write an algorithm that runs in O(n) time.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the length of the longest consecutive sequence.",
        difficulty: "Medium",
        tags: ["Array", "Hash Table", "Union Find"],
        functionName: "longestConsecutive",
        constraints: "0 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
        topicCategory: "Hashing",
        company: ["Google", "Amazon", "Meta"],
        testCases: [
            { input: "100 4 200 1 3 2", expectedOutput: "4", isSample: true, explanation: "The longest consecutive sequence is [1,2,3,4], length 4." },
            { input: "0 3 7 2 5 8 4 6 0 1", expectedOutput: "9", isSample: true },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "1 2 3 4 5", expectedOutput: "5", isSample: false }
        ]
    },
    {
        title: "Top K Frequent Elements",
        slug: "top-k-frequent-elements",
        description: "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.\n\nInput format: First line contains the array separated by spaces. Second line contains k.\nOutput format: Print the k most frequent elements separated by spaces (sorted in ascending order).",
        difficulty: "Medium",
        tags: ["Array", "Hash Table", "Heap"],
        functionName: "topKFrequent",
        constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\nk is in the range [1, number of unique elements].",
        topicCategory: "Hashing",
        company: ["Amazon", "Meta", "Apple"],
        testCases: [
            { input: "1 1 1 2 2 3\n2", expectedOutput: "1 2", isSample: true, explanation: "1 appears 3 times, 2 appears 2 times." },
            { input: "1\n1", expectedOutput: "1", isSample: true },
            { input: "4 1 -1 2 -1 2 3\n2", expectedOutput: "-1 2", isSample: false }
        ]
    },
    {
        title: "Subarray Sum Equals K",
        slug: "subarray-sum-equals-k",
        description: "Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.\n\nA subarray is a contiguous non-empty sequence of elements within an array.\n\nInput format: First line contains the array separated by spaces. Second line contains k.\nOutput format: Print the number of subarrays with sum equal to k.",
        difficulty: "Medium",
        tags: ["Array", "Hash Table", "Prefix Sum"],
        functionName: "subarraySum",
        constraints: "1 <= nums.length <= 2 * 10^4\n-1000 <= nums[i] <= 1000\n-10^7 <= k <= 10^7",
        topicCategory: "Hashing",
        company: ["Google", "Meta", "Amazon"],
        testCases: [
            { input: "1 1 1\n2", expectedOutput: "2", isSample: true, explanation: "The subarrays [1,1] at index 0-1 and 1-2." },
            { input: "1 2 3\n3", expectedOutput: "2", isSample: true },
            { input: "1\n0", expectedOutput: "0", isSample: false },
            { input: "-1 -1 1\n0", expectedOutput: "1", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // SORTING (3 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Merge Intervals",
        slug: "merge-intervals",
        description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\nInput format: First line contains N. Next N lines each contain two integers start and end.\nOutput format: Print merged intervals, one per line (start end).",
        difficulty: "Medium",
        tags: ["Array", "Sorting"],
        functionName: "mergeIntervals",
        constraints: "1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= starti <= endi <= 10^4",
        topicCategory: "Sorting",
        company: ["Google", "Meta", "Amazon", "Microsoft"],
        testCases: [
            { input: "4\n1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18", isSample: true, explanation: "Intervals [1,3] and [2,6] overlap, merged to [1,6]." },
            { input: "2\n1 4\n4 5", expectedOutput: "1 5", isSample: true },
            { input: "1\n1 1", expectedOutput: "1 1", isSample: false },
            { input: "3\n1 4\n0 4\n3 5", expectedOutput: "0 5", isSample: false }
        ]
    },
    {
        title: "Sort Colors",
        slug: "sort-colors",
        description: "Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red (0), white (1), and blue (2).\n\nYou must solve this without using the library sort function.\n\nInput format: A single line containing the array of 0s, 1s, and 2s separated by spaces.\nOutput format: Print the sorted array separated by spaces.",
        difficulty: "Medium",
        tags: ["Array", "Two Pointers", "Sorting"],
        functionName: "sortColors",
        constraints: "n == nums.length\n1 <= n <= 300\nnums[i] is either 0, 1, or 2.",
        topicCategory: "Sorting",
        company: ["Microsoft", "Amazon"],
        testCases: [
            { input: "2 0 2 1 1 0", expectedOutput: "0 0 1 1 2 2", isSample: true },
            { input: "2 0 1", expectedOutput: "0 1 2", isSample: true },
            { input: "0", expectedOutput: "0", isSample: false },
            { input: "1 0", expectedOutput: "0 1", isSample: false }
        ]
    },
    {
        title: "Kth Largest Element in an Array",
        slug: "kth-largest-element",
        description: "Given an integer array nums and an integer k, return the kth largest element in the array.\n\nNote that it is the kth largest element in sorted order, not the kth distinct element.\n\nInput format: First line contains the array separated by spaces. Second line contains k.\nOutput format: Print the kth largest element.",
        difficulty: "Medium",
        tags: ["Array", "Heap", "Sorting", "Quickselect"],
        functionName: "findKthLargest",
        constraints: "1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        topicCategory: "Sorting",
        company: ["Meta", "Amazon", "Google"],
        testCases: [
            { input: "3 2 1 5 6 4\n2", expectedOutput: "5", isSample: true, explanation: "Sorted: [6,5,4,3,2,1], 2nd largest is 5." },
            { input: "3 2 3 1 2 4 5 5 6\n4", expectedOutput: "4", isSample: true },
            { input: "1\n1", expectedOutput: "1", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BINARY SEARCH (4 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Binary Search",
        slug: "binary-search",
        description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.\n\nInput format: First line contains the sorted array separated by spaces. Second line contains target.\nOutput format: Print the index of target, or -1 if not found.",
        difficulty: "Easy",
        tags: ["Array", "Binary Search"],
        functionName: "binarySearch",
        constraints: "1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll elements in nums are unique.\nnums is sorted in ascending order.",
        topicCategory: "Binary Search",
        company: ["Google", "Microsoft"],
        testCases: [
            { input: "-1 0 3 5 9 12\n9", expectedOutput: "4", isSample: true },
            { input: "-1 0 3 5 9 12\n2", expectedOutput: "-1", isSample: true },
            { input: "5\n5", expectedOutput: "0", isSample: false },
            { input: "1 2 3 4 5 6 7 8 9 10\n7", expectedOutput: "6", isSample: false }
        ]
    },
    {
        title: "Search in Rotated Sorted Array",
        slug: "search-in-rotated-sorted-array",
        description: "You are given an integer array nums sorted in ascending order (with distinct values), that is possibly rotated at an unknown pivot index.\n\nGiven the array nums after rotation and an integer target, return the index of target if it is in nums, or -1 if it is not.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\nInput format: First line contains the rotated array. Second line contains target.\nOutput format: Print the index, or -1.",
        difficulty: "Medium",
        tags: ["Array", "Binary Search"],
        functionName: "searchRotated",
        constraints: "1 <= nums.length <= 5000\n-10^4 <= nums[i] <= 10^4\nAll values of nums are unique.\nnums is ascending and then rotated.",
        topicCategory: "Binary Search",
        company: ["Google", "Amazon", "Meta", "Microsoft"],
        testCases: [
            { input: "4 5 6 7 0 1 2\n0", expectedOutput: "4", isSample: true },
            { input: "4 5 6 7 0 1 2\n3", expectedOutput: "-1", isSample: true },
            { input: "1\n0", expectedOutput: "-1", isSample: false },
            { input: "1 3\n3", expectedOutput: "1", isSample: false }
        ]
    },
    {
        title: "Find Minimum in Rotated Sorted Array",
        slug: "find-minimum-rotated-array",
        description: "Given a sorted rotated array of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in O(log n) time.\n\nInput format: A single line containing the rotated sorted array.\nOutput format: Print the minimum element.",
        difficulty: "Medium",
        tags: ["Array", "Binary Search"],
        functionName: "findMin",
        constraints: "n == nums.length\n1 <= n <= 5000\n-5000 <= nums[i] <= 5000\nAll values are unique.",
        topicCategory: "Binary Search",
        company: ["Google", "Microsoft", "Amazon"],
        testCases: [
            { input: "3 4 5 1 2", expectedOutput: "1", isSample: true },
            { input: "4 5 6 7 0 1 2", expectedOutput: "0", isSample: true },
            { input: "11 13 15 17", expectedOutput: "11", isSample: false },
            { input: "2 1", expectedOutput: "1", isSample: false }
        ]
    },
    {
        title: "Search a 2D Matrix",
        slug: "search-2d-matrix",
        description: "You are given an m x n integer matrix with two properties:\n- Each row is sorted in non-decreasing order.\n- The first integer of each row is greater than the last integer of the previous row.\n\nGiven an integer target, return true if target is in matrix, or false otherwise. Write O(log(m*n)) solution.\n\nInput format: First line contains m and n. Next m lines each contain n integers. Last line contains target.\nOutput format: Print true or false.",
        difficulty: "Medium",
        tags: ["Array", "Binary Search", "Matrix"],
        functionName: "searchMatrix",
        constraints: "m == matrix.length\nn == matrix[i].length\n1 <= m, n <= 100\n-10^4 <= matrix[i][j], target <= 10^4",
        topicCategory: "Binary Search",
        company: ["Amazon", "Microsoft"],
        testCases: [
            { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", expectedOutput: "true", isSample: true },
            { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n13", expectedOutput: "false", isSample: true },
            { input: "1 1\n1\n1", expectedOutput: "true", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED LISTS (4 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Reverse Linked List",
        slug: "reverse-linked-list",
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nInput format: A single line containing linked list values separated by spaces.\nOutput format: Print the reversed linked list values separated by spaces.",
        difficulty: "Easy",
        tags: ["Linked List", "Recursion"],
        functionName: "reverseList",
        constraints: "0 <= Number of nodes <= 5000\n-5000 <= Node.val <= 5000",
        topicCategory: "Linked Lists",
        company: ["Amazon", "Microsoft", "Apple"],
        testCases: [
            { input: "1 2 3 4 5", expectedOutput: "5 4 3 2 1", isSample: true },
            { input: "1 2", expectedOutput: "2 1", isSample: true },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "3 7 2 9", expectedOutput: "9 2 7 3", isSample: false }
        ]
    },
    {
        title: "Merge Two Sorted Lists",
        slug: "merge-two-sorted-lists",
        description: "You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nInput format: First line contains list1 values. Second line contains list2 values.\nOutput format: Print the merged sorted list.",
        difficulty: "Easy",
        tags: ["Linked List", "Recursion"],
        functionName: "mergeTwoLists",
        constraints: "0 <= List length <= 50\n-100 <= Node.val <= 100\nBoth lists are sorted in non-decreasing order.",
        topicCategory: "Linked Lists",
        company: ["Amazon", "Google", "Microsoft", "Apple"],
        testCases: [
            { input: "1 2 4\n1 3 4", expectedOutput: "1 1 2 3 4 4", isSample: true },
            { input: "\n0", expectedOutput: "0", isSample: true },
            { input: "5\n1 2 4", expectedOutput: "1 2 4 5", isSample: false }
        ]
    },
    {
        title: "Linked List Cycle",
        slug: "linked-list-cycle",
        description: "Given head, the head of a linked list, determine if the linked list has a cycle in it.\n\nFor this problem: Input is given as an array of values and a pos value indicating where the tail connects to (0-indexed). If pos is -1, there is no cycle.\n\nInput format: First line contains the list values. Second line contains pos.\nOutput format: Print true or false.",
        difficulty: "Easy",
        tags: ["Linked List", "Two Pointers", "Hash Table"],
        functionName: "hasCycle",
        constraints: "0 <= Number of nodes <= 10^4\n-10^5 <= Node.val <= 10^5\npos is -1 or a valid index.",
        topicCategory: "Linked Lists",
        company: ["Amazon", "Microsoft"],
        testCases: [
            { input: "3 2 0 -4\n1", expectedOutput: "true", isSample: true, explanation: "Tail connects to node index 1." },
            { input: "1 2\n0", expectedOutput: "true", isSample: true },
            { input: "1\n-1", expectedOutput: "false", isSample: false },
            { input: "1 2 3 4\n-1", expectedOutput: "false", isSample: false }
        ]
    },
    {
        title: "Remove Nth Node From End of List",
        slug: "remove-nth-node-from-end",
        description: "Given the head of a linked list, remove the nth node from the end of the list and return its head.\n\nInput format: First line contains the list values. Second line contains n.\nOutput format: Print the modified list values.",
        difficulty: "Medium",
        tags: ["Linked List", "Two Pointers"],
        functionName: "removeNthFromEnd",
        constraints: "1 <= sz <= 30\n0 <= Node.val <= 100\n1 <= n <= sz",
        topicCategory: "Linked Lists",
        company: ["Meta", "Amazon"],
        testCases: [
            { input: "1 2 3 4 5\n2", expectedOutput: "1 2 3 5", isSample: true, explanation: "Remove 4 (2nd from end)." },
            { input: "1\n1", expectedOutput: "", isSample: true },
            { input: "1 2\n1", expectedOutput: "1", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // TREES (5 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Maximum Depth of Binary Tree",
        slug: "maximum-depth-of-binary-tree",
        description: "Given the root of a binary tree, return its maximum depth.\n\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\nInput format: Level-order traversal of the tree, null nodes represented as -1.\nOutput format: Print the maximum depth.",
        difficulty: "Easy",
        tags: ["Tree", "DFS", "BFS", "Binary Tree"],
        functionName: "maxDepth",
        constraints: "0 <= Number of nodes <= 10^4\n-100 <= Node.val <= 100",
        topicCategory: "Trees",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "3 9 20 -1 -1 15 7", expectedOutput: "3", isSample: true },
            { input: "1 -1 2", expectedOutput: "2", isSample: true },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "-1", expectedOutput: "0", isSample: false }
        ]
    },
    {
        title: "Invert Binary Tree",
        slug: "invert-binary-tree",
        description: "Given the root of a binary tree, invert the tree, and return its root.\n\nInverting means swapping left and right children recursively.\n\nInput format: Level-order traversal, null nodes as -1.\nOutput format: Print the level-order traversal of the inverted tree (exclude trailing -1s).",
        difficulty: "Easy",
        tags: ["Tree", "DFS", "BFS", "Binary Tree"],
        functionName: "invertTree",
        constraints: "0 <= Number of nodes <= 100\n-100 <= Node.val <= 100",
        topicCategory: "Trees",
        company: ["Google", "Amazon"],
        testCases: [
            { input: "4 2 7 1 3 6 9", expectedOutput: "4 7 2 9 6 3 1", isSample: true },
            { input: "2 1 3", expectedOutput: "2 3 1", isSample: true },
            { input: "1", expectedOutput: "1", isSample: false }
        ]
    },
    {
        title: "Binary Tree Level Order Traversal",
        slug: "binary-tree-level-order",
        description: "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).\n\nInput format: Level-order input with -1 for null nodes.\nOutput format: Print each level on a separate line, values separated by spaces.",
        difficulty: "Medium",
        tags: ["Tree", "BFS", "Binary Tree"],
        functionName: "levelOrder",
        constraints: "0 <= Number of nodes <= 2000\n-1000 <= Node.val <= 1000",
        topicCategory: "Trees",
        company: ["Amazon", "Meta", "Microsoft"],
        testCases: [
            { input: "3 9 20 -1 -1 15 7", expectedOutput: "3\n9 20\n15 7", isSample: true },
            { input: "1", expectedOutput: "1", isSample: true },
            { input: "-1", expectedOutput: "", isSample: false }
        ]
    },
    {
        title: "Validate Binary Search Tree",
        slug: "validate-bst",
        description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST has: left subtree values < root, right subtree values > root, and both subtrees are also BSTs.\n\nInput format: Level-order traversal with -1 for null.\nOutput format: Print true or false.",
        difficulty: "Medium",
        tags: ["Tree", "DFS", "BST", "Binary Tree"],
        functionName: "isValidBST",
        constraints: "1 <= Number of nodes <= 10^4\n-2^31 <= Node.val <= 2^31 - 1",
        topicCategory: "Trees",
        company: ["Amazon", "Meta", "Microsoft"],
        testCases: [
            { input: "2 1 3", expectedOutput: "true", isSample: true },
            { input: "5 1 4 -1 -1 3 6", expectedOutput: "false", isSample: true, explanation: "Node 4 is in right subtree but less than root 5, and contains 3 which is less than 4." },
            { input: "1", expectedOutput: "true", isSample: false },
            { input: "5 4 6 -1 -1 3 7", expectedOutput: "false", isSample: false }
        ]
    },
    {
        title: "Lowest Common Ancestor of a BST",
        slug: "lowest-common-ancestor-bst",
        description: "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes p and q.\n\nThe LCA is the lowest node that has both p and q as descendants (a node can be a descendant of itself).\n\nInput format: First line is the level-order BST with -1 for null. Second line contains p and q values.\nOutput format: Print the LCA value.",
        difficulty: "Medium",
        tags: ["Tree", "DFS", "BST", "Binary Tree"],
        functionName: "lowestCommonAncestor",
        constraints: "2 <= Number of nodes <= 10^5\n-10^9 <= Node.val <= 10^9\nAll values are unique.\np != q\np and q exist in the BST.",
        topicCategory: "Trees",
        company: ["Meta", "Amazon", "Microsoft"],
        testCases: [
            { input: "6 2 8 0 4 7 9 -1 -1 3 5\n2 8", expectedOutput: "6", isSample: true, explanation: "LCA of 2 and 8 is 6." },
            { input: "6 2 8 0 4 7 9 -1 -1 3 5\n2 4", expectedOutput: "2", isSample: true },
            { input: "2 1 3\n1 3", expectedOutput: "2", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // GRAPHS (4 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Number of Islands",
        slug: "number-of-islands",
        description: "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\nInput format: First line contains m and n. Next m lines each contain n characters (1 or 0).\nOutput format: Print the number of islands.",
        difficulty: "Medium",
        tags: ["Graph", "DFS", "BFS", "Matrix"],
        functionName: "numIslands",
        constraints: "m == grid.length\nn == grid[i].length\n1 <= m, n <= 300\ngrid[i][j] is '0' or '1'.",
        topicCategory: "Graphs",
        company: ["Amazon", "Google", "Meta", "Microsoft"],
        testCases: [
            { input: "4 5\n11110\n11010\n11000\n00000", expectedOutput: "1", isSample: true },
            { input: "4 5\n11000\n11000\n00100\n00011", expectedOutput: "3", isSample: true },
            { input: "1 1\n1", expectedOutput: "1", isSample: false },
            { input: "1 1\n0", expectedOutput: "0", isSample: false }
        ]
    },
    {
        title: "Clone Graph",
        slug: "clone-graph",
        description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.\n\nFor this problem, the graph is represented as an adjacency list.\n\nInput format: First line contains N (number of nodes). Next N lines contain neighbors (1-indexed) for each node.\nOutput format: Print the adjacency list of the cloned graph (same format).",
        difficulty: "Medium",
        tags: ["Graph", "DFS", "BFS", "Hash Table"],
        functionName: "cloneGraph",
        constraints: "1 <= Number of nodes <= 100\n1 <= Node.val <= 100\nNode.val is unique for each node.",
        topicCategory: "Graphs",
        company: ["Google", "Meta", "Amazon"],
        testCases: [
            { input: "4\n2 4\n1 3\n2 4\n1 3", expectedOutput: "2 4\n1 3\n2 4\n1 3", isSample: true },
            { input: "1\n", expectedOutput: "", isSample: true },
            { input: "2\n2\n1", expectedOutput: "2\n1", isSample: false }
        ]
    },
    {
        title: "Course Schedule",
        slug: "course-schedule",
        description: "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nReturn true if you can finish all courses, false otherwise.\n\nInput format: First line contains numCourses. Second line contains number of prerequisites. Next lines contain pairs (ai bi).\nOutput format: Print true or false.",
        difficulty: "Medium",
        tags: ["Graph", "DFS", "BFS", "Topological Sort"],
        functionName: "canFinish",
        constraints: "1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nAll prerequisite pairs are unique.",
        topicCategory: "Graphs",
        company: ["Amazon", "Google", "Meta", "Microsoft"],
        testCases: [
            { input: "2\n1\n1 0", expectedOutput: "true", isSample: true, explanation: "Take course 0 then course 1." },
            { input: "2\n2\n1 0\n0 1", expectedOutput: "false", isSample: true, explanation: "Circular dependency." },
            { input: "1\n0", expectedOutput: "true", isSample: false },
            { input: "3\n2\n1 0\n2 1", expectedOutput: "true", isSample: false }
        ]
    },
    {
        title: "Pacific Atlantic Water Flow",
        slug: "pacific-atlantic-water-flow",
        description: "Given an m x n matrix of non-negative integers representing the height of each unit cell, find all cells that can flow to both the Pacific and Atlantic oceans.\n\nWater can flow from a cell to neighboring cells (up, down, left, right) with height less than or equal to the current cell.\n\nInput format: First line contains m and n. Next m lines each contain n heights.\nOutput format: Print coordinates (row col) of cells that can reach both oceans, one per line, sorted.",
        difficulty: "Medium",
        tags: ["Graph", "DFS", "BFS", "Matrix"],
        functionName: "pacificAtlantic",
        constraints: "m == heights.length\nn == heights[r].length\n1 <= m, n <= 200\n0 <= heights[r][c] <= 10^5",
        topicCategory: "Graphs",
        company: ["Google", "Amazon"],
        testCases: [
            { input: "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4", expectedOutput: "0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0", isSample: true },
            { input: "1 1\n1", expectedOutput: "0 0", isSample: true }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // DYNAMIC PROGRAMMING (5 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Climbing Stairs",
        slug: "climbing-stairs",
        description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nInput format: A single integer n.\nOutput format: Print the number of distinct ways.",
        difficulty: "Easy",
        tags: ["Dynamic Programming", "Math", "Memoization"],
        functionName: "climbStairs",
        constraints: "1 <= n <= 45",
        topicCategory: "Dynamic Programming",
        company: ["Amazon", "Google", "Apple"],
        testCases: [
            { input: "2", expectedOutput: "2", isSample: true, explanation: "Two ways: 1+1 or 2." },
            { input: "3", expectedOutput: "3", isSample: true, explanation: "Three ways: 1+1+1, 1+2, 2+1." },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "5", expectedOutput: "8", isSample: false },
            { input: "10", expectedOutput: "89", isSample: false }
        ]
    },
    {
        title: "Coin Change",
        slug: "coin-change",
        description: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up, return -1.\n\nInput format: First line contains coins separated by spaces. Second line contains the amount.\nOutput format: Print the minimum number of coins, or -1.",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "BFS"],
        functionName: "coinChange",
        constraints: "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
        topicCategory: "Dynamic Programming",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            // Greedy-trap case: 11 + 1 + 1 + 1 + 1 uses 5 coins, 5 + 5 + 5 uses 3.
            // (The amount was 11, for which the answer is 1 coin, not 3.)
            { input: "1 5 11\n15", expectedOutput: "3", isSample: true, explanation: "15 = 5 + 5 + 5 (greedy would pick 11 + 1 + 1 + 1 + 1)" },
            { input: "2\n3", expectedOutput: "-1", isSample: true },
            { input: "1\n0", expectedOutput: "0", isSample: false },
            { input: "1 2 5\n11", expectedOutput: "3", isSample: false }
        ]
    },
    {
        title: "Longest Increasing Subsequence",
        slug: "longest-increasing-subsequence",
        description: "Given an integer array nums, return the length of the longest strictly increasing subsequence.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the length of the LIS.",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Binary Search"],
        functionName: "lengthOfLIS",
        constraints: "1 <= nums.length <= 2500\n-10^4 <= nums[i] <= 10^4",
        topicCategory: "Dynamic Programming",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "10 9 2 5 3 7 101 18", expectedOutput: "4", isSample: true, explanation: "LIS is [2,3,7,101], length 4." },
            { input: "0 1 0 3 2 3", expectedOutput: "4", isSample: true },
            { input: "7 7 7 7 7", expectedOutput: "1", isSample: false },
            { input: "1 2 3 4 5", expectedOutput: "5", isSample: false }
        ]
    },
    {
        title: "House Robber",
        slug: "house-robber",
        description: "You are a robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected — if two adjacent houses are broken into, the police will be alerted.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob without alerting the police.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the maximum amount.",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Array"],
        functionName: "rob",
        constraints: "1 <= nums.length <= 100\n0 <= nums[i] <= 400",
        topicCategory: "Dynamic Programming",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "1 2 3 1", expectedOutput: "4", isSample: true, explanation: "Rob house 1 (1) and house 3 (3) = 4." },
            { input: "2 7 9 3 1", expectedOutput: "12", isSample: true, explanation: "Rob house 1 (2) + house 3 (9) + house 5 (1) = 12." },
            { input: "0", expectedOutput: "0", isSample: false },
            { input: "100", expectedOutput: "100", isSample: false }
        ]
    },
    {
        title: "Unique Paths",
        slug: "unique-paths",
        description: "A robot is located at the top-left corner of a m x n grid. The robot can only move either down or right at any point in time. The robot is trying to reach the bottom-right corner.\n\nHow many possible unique paths are there?\n\nInput format: Two integers m and n on a single line.\nOutput format: Print the number of unique paths.",
        difficulty: "Medium",
        tags: ["Dynamic Programming", "Math", "Combinatorics"],
        functionName: "uniquePaths",
        constraints: "1 <= m, n <= 100",
        topicCategory: "Dynamic Programming",
        company: ["Google", "Amazon", "Microsoft"],
        testCases: [
            { input: "3 7", expectedOutput: "28", isSample: true },
            { input: "3 2", expectedOutput: "3", isSample: true },
            { input: "1 1", expectedOutput: "1", isSample: false },
            { input: "7 3", expectedOutput: "28", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BIT MANIPULATION (3 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Single Number",
        slug: "single-number",
        description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with O(n) time and O(1) extra space.\n\nInput format: A single line containing the array separated by spaces.\nOutput format: Print the single number.",
        difficulty: "Easy",
        tags: ["Bit Manipulation", "Array"],
        functionName: "singleNumber",
        constraints: "1 <= nums.length <= 3 * 10^4\n-3 * 10^4 <= nums[i] <= 3 * 10^4\nEvery element appears twice except for one.",
        topicCategory: "Bit Manipulation",
        company: ["Amazon", "Google"],
        testCases: [
            { input: "2 2 1", expectedOutput: "1", isSample: true },
            { input: "4 1 2 1 2", expectedOutput: "4", isSample: true },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "5 3 5 3 7", expectedOutput: "7", isSample: false }
        ]
    },
    {
        title: "Number of 1 Bits",
        slug: "number-of-1-bits",
        description: "Write a function that takes the binary representation of a positive integer and returns the number of set bits (1 bits) it has (also known as the Hamming weight).\n\nInput format: A single non-negative integer.\nOutput format: Print the number of 1 bits.",
        difficulty: "Easy",
        tags: ["Bit Manipulation"],
        functionName: "hammingWeight",
        constraints: "0 <= n <= 2^31 - 1",
        topicCategory: "Bit Manipulation",
        company: ["Microsoft", "Apple"],
        testCases: [
            { input: "11", expectedOutput: "3", isSample: true, explanation: "11 in binary is 1011, which has three 1-bits." },
            { input: "128", expectedOutput: "1", isSample: true, explanation: "128 in binary is 10000000." },
            { input: "0", expectedOutput: "0", isSample: false },
            { input: "255", expectedOutput: "8", isSample: false }
        ]
    },
    {
        title: "Counting Bits",
        slug: "counting-bits",
        description: "Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1's in the binary representation of i.\n\nInput format: A single integer n.\nOutput format: Print the array separated by spaces.",
        difficulty: "Easy",
        tags: ["Bit Manipulation", "Dynamic Programming"],
        functionName: "countBits",
        constraints: "0 <= n <= 10^5",
        topicCategory: "Bit Manipulation",
        company: ["Amazon", "Microsoft"],
        testCases: [
            { input: "2", expectedOutput: "0 1 1", isSample: true },
            { input: "5", expectedOutput: "0 1 1 2 1 2", isSample: true },
            { input: "0", expectedOutput: "0", isSample: false },
            { input: "8", expectedOutput: "0 1 1 2 1 2 2 3 1", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // TRIES (2 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Implement Trie (Prefix Tree)",
        slug: "implement-trie",
        description: "Implement a trie with insert, search, and startsWith methods.\n\n- insert(word) — Inserts the string word into the trie.\n- search(word) — Returns true if word is in the trie.\n- startsWith(prefix) — Returns true if any word starts with prefix.\n\nInput format: First line contains N operations. Next N lines contain: operation word\nOperations: insert, search, startsWith\nOutput format: For search and startsWith, print true or false on separate lines.",
        difficulty: "Medium",
        tags: ["Trie", "Hash Table", "String", "Design"],
        functionName: "Trie",
        constraints: "1 <= word.length, prefix.length <= 2000\nword and prefix consist only of lowercase English letters.\nAt most 3 * 10^4 calls to insert, search, and startsWith.",
        topicCategory: "Tries",
        company: ["Google", "Amazon", "Microsoft"],
        testCases: [
            { input: "5\ninsert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app", expectedOutput: "true\nfalse\ntrue", isSample: true },
            { input: "3\ninsert hello\nsearch hello\nsearch hell", expectedOutput: "true\nfalse", isSample: true },
            { input: "4\ninsert a\nsearch a\nstartsWith a\nsearch b", expectedOutput: "true\ntrue\nfalse", isSample: false }
        ]
    },
    {
        title: "Word Search",
        slug: "word-search",
        description: "Given an m x n grid of characters board and a string word, return true if word exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.\n\nInput format: First line contains m and n. Next m lines contain the grid rows (characters separated by spaces). Last line contains the word.\nOutput format: Print true or false.",
        difficulty: "Medium",
        tags: ["Array", "Backtracking", "Matrix"],
        functionName: "exist",
        constraints: "m == board.length\nn == board[i].length\n1 <= m, n <= 6\n1 <= word.length <= 15",
        topicCategory: "Tries",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "3 4\nA B C E\nS F C S\nA D E E\nABCCED", expectedOutput: "true", isSample: true },
            { input: "3 4\nA B C E\nS F C S\nA D E E\nSEE", expectedOutput: "true", isSample: true },
            { input: "3 4\nA B C E\nS F C S\nA D E E\nABCB", expectedOutput: "false", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // STACK & QUEUE (3 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Valid Parentheses",
        slug: "valid-parentheses",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nInput format: A single line containing the string.\nOutput format: Print true or false.",
        difficulty: "Easy",
        tags: ["Stack", "String"],
        functionName: "isValid",
        constraints: "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
        topicCategory: "Stack & Queue",
        company: ["Amazon", "Google", "Meta", "Microsoft"],
        testCases: [
            { input: "()", expectedOutput: "true", isSample: true },
            { input: "()[]{}", expectedOutput: "true", isSample: true },
            { input: "(]", expectedOutput: "false", isSample: false },
            { input: "([)]", expectedOutput: "false", isSample: false },
            { input: "{[]}", expectedOutput: "true", isSample: false }
        ]
    },
    {
        title: "Min Stack",
        slug: "min-stack",
        description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nImplement the MinStack class with: push(val), pop(), top(), getMin().\n\nInput format: First line contains N operations. Next N lines contain operation and optional value.\nOperations: push val, pop, top, getMin\nOutput format: For top and getMin, print the value on separate lines.",
        difficulty: "Medium",
        tags: ["Stack", "Design"],
        functionName: "MinStack",
        constraints: "-2^31 <= val <= 2^31 - 1\nMethods pop, top and getMin will always be called on non-empty stacks.\nAt most 3 * 10^4 calls.",
        topicCategory: "Stack & Queue",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "7\npush -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", expectedOutput: "-3\n0\n-2", isSample: true },
            { input: "5\npush 1\npush 2\ntop\ngetMin\npop", expectedOutput: "2\n1", isSample: true }
        ]
    },
    {
        title: "Daily Temperatures",
        slug: "daily-temperatures",
        description: "Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day, answer[i] == 0.\n\nInput format: A single line containing temperatures separated by spaces.\nOutput format: Print the answer array separated by spaces.",
        difficulty: "Medium",
        tags: ["Stack", "Array", "Monotonic Stack"],
        functionName: "dailyTemperatures",
        constraints: "1 <= temperatures.length <= 10^5\n30 <= temperatures[i] <= 100",
        topicCategory: "Stack & Queue",
        company: ["Google", "Amazon", "Meta"],
        testCases: [
            { input: "73 74 75 71 69 72 76 73", expectedOutput: "1 1 4 2 1 1 0 0", isSample: true },
            { input: "30 40 50 60", expectedOutput: "1 1 1 0", isSample: true },
            { input: "30 60 90", expectedOutput: "1 1 0", isSample: false },
            { input: "55", expectedOutput: "0", isSample: false }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // HARD (8 problems)
    // ═══════════════════════════════════════════════════════════════
    {
        title: "Trapping Rain Water",
        slug: "trapping-rain-water",
        description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nInput format: A single line containing the heights separated by spaces.\nOutput format: Print the total units of trapped water.",
        difficulty: "Hard",
        tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
        functionName: "trap",
        constraints: "1 <= height.length <= 2 * 10^4\n0 <= height[i] <= 10^5",
        topicCategory: "Arrays",
        company: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
        testCases: [
            { input: "0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6", isSample: true, explanation: "Six units of rain water are trapped between the bars." },
            { input: "4 2 0 3 2 5", expectedOutput: "9", isSample: true, explanation: "Nine units are trapped in the valleys between the tall bars." },
            { input: "3 0 2", expectedOutput: "2", isSample: false },
            { input: "1 2 3 4", expectedOutput: "0", isSample: false }
        ]
    },
    {
        title: "Median of Two Sorted Arrays",
        slug: "median-of-two-sorted-arrays",
        description: "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays combined.\n\nInput format: First line contains nums1 (may be empty). Second line contains nums2 (may be empty).\nOutput format: Print the median rounded to exactly one decimal place.",
        difficulty: "Hard",
        tags: ["Array", "Binary Search", "Divide and Conquer"],
        functionName: "findMedianSortedArrays",
        constraints: "0 <= m, n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
        topicCategory: "Binary Search",
        company: ["Google", "Amazon", "Microsoft", "Apple"],
        testCases: [
            { input: "1 3\n2", expectedOutput: "2.0", isSample: true, explanation: "The merged array is [1,2,3] and the median is 2.0." },
            { input: "1 2\n3 4", expectedOutput: "2.5", isSample: true, explanation: "The merged array is [1,2,3,4] and the median is (2 + 3) / 2 = 2.5." },
            { input: "\n1", expectedOutput: "1.0", isSample: false },
            { input: "1 2 3\n4 5 6", expectedOutput: "3.5", isSample: false }
        ]
    },
    {
        title: "Minimum Window Substring",
        slug: "minimum-window-substring",
        description: "Given two strings s and t, return the minimum window substring of s that contains every character of t (including duplicates). If there is no such substring, print an empty line.\n\nThe answer is guaranteed to be unique.\n\nInput format: First line contains s. Second line contains t.\nOutput format: Print the minimum window substring, or an empty line if none exists.",
        difficulty: "Hard",
        tags: ["String", "Sliding Window", "Hash Table"],
        functionName: "minWindow",
        constraints: "1 <= s.length, t.length <= 10^5\ns and t consist of uppercase and lowercase English letters.",
        topicCategory: "Strings",
        company: ["Meta", "Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "ADOBECODEBANC\nABC", expectedOutput: "BANC", isSample: true, explanation: "The minimum window containing A, B and C is BANC." },
            { input: "a\na", expectedOutput: "a", isSample: true, explanation: "The whole string is the minimum window." },
            { input: "a\naa", expectedOutput: "", isSample: false },
            { input: "ADOBECODEBANC\nABCD", expectedOutput: "ADOBEC", isSample: false }
        ]
    },
    {
        title: "Edit Distance",
        slug: "edit-distance",
        description: "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.\n\nYou may insert a character, delete a character, or replace a character.\n\nInput format: First line contains word1. Second line contains word2.\nOutput format: Print the minimum number of operations.",
        difficulty: "Hard",
        tags: ["String", "Dynamic Programming"],
        functionName: "minDistance",
        constraints: "0 <= word1.length, word2.length <= 500\nword1 and word2 consist of lowercase English letters.",
        topicCategory: "Dynamic Programming",
        company: ["Google", "Amazon", "Microsoft", "Apple"],
        testCases: [
            { input: "horse\nros", expectedOutput: "3", isSample: true, explanation: "horse -> rorse -> rose -> ros takes three operations." },
            { input: "intention\nexecution", expectedOutput: "5", isSample: true, explanation: "Five operations are required." },
            { input: "abc\nabc", expectedOutput: "0", isSample: false },
            { input: "abc\nyabd", expectedOutput: "2", isSample: false }
        ]
    },
    {
        title: "Largest Rectangle in Histogram",
        slug: "largest-rectangle-in-histogram",
        description: "Given an array of integers representing the histogram's bar heights where the width of each bar is 1, return the area of the largest rectangle in the histogram.\n\nInput format: A single line containing the bar heights separated by spaces.\nOutput format: Print the largest rectangle area.",
        difficulty: "Hard",
        tags: ["Array", "Stack", "Monotonic Stack"],
        functionName: "largestRectangleArea",
        constraints: "1 <= heights.length <= 10^5\n0 <= heights[i] <= 10^4",
        topicCategory: "Stack & Queue",
        company: ["Amazon", "Google", "Microsoft"],
        testCases: [
            { input: "2 1 5 6 2 3", expectedOutput: "10", isSample: true, explanation: "The largest rectangle spans the bars of height 5 and 6, giving 5 * 2 = 10." },
            { input: "2 4", expectedOutput: "4", isSample: true, explanation: "The largest rectangle is the single bar of height 4." },
            { input: "1", expectedOutput: "1", isSample: false },
            { input: "5 4 1 2", expectedOutput: "8", isSample: false }
        ]
    },
    {
        title: "Sliding Window Maximum",
        slug: "sliding-window-maximum",
        description: "You are given an array of integers nums and a sliding window of size k moving from the very left to the very right of the array. Return the maximum of each window.\n\nInput format: First line contains the array separated by spaces. Second line contains k.\nOutput format: Print the maximum of each window separated by spaces.",
        difficulty: "Hard",
        tags: ["Array", "Sliding Window", "Heap", "Monotonic Queue"],
        functionName: "maxSlidingWindow",
        constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= nums.length",
        topicCategory: "Arrays",
        company: ["Amazon", "Google", "Meta", "Microsoft"],
        testCases: [
            { input: "1 3 -1 -3 5 3 6 7\n3", expectedOutput: "3 3 5 5 6 7", isSample: true, explanation: "The windows are [1,3,-1], [3,-1,-3], [-1,-3,5], [-3,5,3], [5,3,6], [3,6,7]." },
            { input: "1\n1", expectedOutput: "1", isSample: true, explanation: "A single window containing one element." },
            { input: "9 11\n2", expectedOutput: "11", isSample: false },
            { input: "4 -2\n2", expectedOutput: "4", isSample: false }
        ]
    },
    {
        title: "Word Ladder",
        slug: "word-ladder",
        description: "A transformation sequence from beginWord to endWord changes exactly one letter at a time, and every intermediate word must exist in the word list.\n\nReturn the number of words in the shortest transformation sequence, or 0 if no such sequence exists.\n\nInput format: First line contains beginWord and endWord separated by a space. Second line contains the word list separated by spaces.\nOutput format: Print the length of the shortest sequence, or 0.",
        difficulty: "Hard",
        tags: ["Graph", "BFS", "Hash Table", "String"],
        functionName: "ladderLength",
        constraints: "1 <= beginWord.length <= 10\nendWord.length == beginWord.length\n1 <= wordList.length <= 5000\nAll words consist of lowercase English letters.",
        topicCategory: "Graphs",
        company: ["Amazon", "Google", "Meta"],
        testCases: [
            { input: "hit cog\nhot dot dog lot log cog", expectedOutput: "5", isSample: true, explanation: "hit -> hot -> dot -> dog -> cog is five words long." },
            { input: "hit cog\nhot dot dog lot log", expectedOutput: "0", isSample: true, explanation: "endWord is not in the word list, so no sequence exists." },
            { input: "a c\na b c", expectedOutput: "2", isSample: false },
            { input: "hot dog\nhot dog", expectedOutput: "0", isSample: false }
        ]
    },
    {
        title: "Binary Tree Maximum Path Sum",
        slug: "binary-tree-maximum-path-sum",
        description: "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge connecting them. A node can appear at most once in the path, and the path does not need to pass through the root.\n\nReturn the maximum sum of any non-empty path.\n\nInput format: Level-order traversal of the tree. Because node values may be negative, null children are written as the letter N (not -1).\nOutput format: Print the maximum path sum.",
        difficulty: "Hard",
        tags: ["Tree", "DFS", "Dynamic Programming", "Binary Tree"],
        functionName: "maxPathSum",
        constraints: "1 <= number of nodes <= 3 * 10^4\n-1000 <= Node.val <= 1000",
        topicCategory: "Trees",
        company: ["Meta", "Amazon", "Microsoft", "Google"],
        testCases: [
            { input: "1 2 3", expectedOutput: "6", isSample: true, explanation: "The optimal path is 2 -> 1 -> 3 with sum 6." },
            { input: "-10 9 20 N N 15 7", expectedOutput: "42", isSample: true, explanation: "The optimal path is 15 -> 20 -> 7 with sum 42." },
            { input: "-3", expectedOutput: "-3", isSample: false },
            { input: "2 -1", expectedOutput: "2", isSample: false }
        ]
    }
];

/*
|--------------------------------------------------------------------------
| Seeding modes
|--------------------------------------------------------------------------
| Default (upsert): existing problems are updated in place and new ones are
| added. Problem _ids are preserved, so submissions that reference them stay
| intact. Safe to re-run.
|
| --fresh: deletes every problem and test case first. Only for a clean
| database — it orphans any existing submissions.
*/

const FRESH = process.argv.includes("--fresh");

const seedDatabase = async () => {

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected!");

    // 1. Get or create a default admin user
    //    The password MUST be bcrypt-hashed: the seed previously stored the
    //    literal string "hashedpassword123", so nobody could ever log in as
    //    the seeded admin.
    let admin = await User.findOne({ email: "admin@codejudge.com" });

    if (!admin) {
        const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";

        admin = await User.create({
            username: "admin",
            email: "admin@codejudge.com",
            password: await bcrypt.hash(adminPassword, 10),
            role: "admin"
        });

        console.log("Created default admin user.");
        console.log(`   ↳ login: admin@codejudge.com / ${adminPassword}`);
    }

    // 2. Optional clean slate
    if (FRESH) {
        await Problem.deleteMany({});
        await TestCase.deleteMany({});
        console.log("🗑️  --fresh: cleared all existing problems and test cases.");
    }

    // 3. Upsert every problem with its test cases
    let created = 0;
    let updated = 0;
    let totalTestCases = 0;

    for (const { testCases, ...fields } of PROBLEMS) {

        const existing = await Problem.findOne({ slug: fields.slug });

        const problem = existing || new Problem({ slug: fields.slug });

        Object.assign(problem, fields, {
            createdBy: problem.createdBy || admin._id,
            // Don't silently republish a problem an admin has unpublished
            isPublished: existing ? problem.isPublished : true,
            supportedLanguages: [...SUPPORTED_LANGUAGES]
        });

        await problem.save();

        // Test cases are replaced wholesale — they belong to the seed, and
        // this keeps a re-run from duplicating them.
        await TestCase.deleteMany({ problemId: problem._id });

        await TestCase.insertMany(testCases.map((tc, index) => ({
            problemId: problem._id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample || false,
            explanation: tc.explanation || "",
            order: index + 1,
            isActive: true
        })));

        totalTestCases += testCases.length;
        existing ? updated++ : created++;

        console.log(`  ${existing ? "↻" : "✅"} ${problem.title} (${problem.difficulty}) — ${testCases.length} test cases`);
    }

    const byDifficulty = PROBLEMS.reduce((acc, p) => {
        acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
        return acc;
    }, {});

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   📚 ${created} created, ${updated} updated (${PROBLEMS.length} total)`);
    console.log(`   📊 ${Object.entries(byDifficulty).map(([d, n]) => `${d}: ${n}`).join(", ")}`);
    console.log(`   🧪 ${totalTestCases} test cases`);
    console.log(`   🗂️  ${[...new Set(PROBLEMS.map(p => p.topicCategory))].length} topics, ${[...new Set(PROBLEMS.flatMap(p => p.company || []))].length} companies`);

};

seedDatabase()
    .catch((err) => {
        console.error("❌ Seeding failed:", err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
