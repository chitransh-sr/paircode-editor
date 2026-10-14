import type { LanguageMeta, RoomFile } from "@/types/execution";

export const LANGUAGES: LanguageMeta[] = [
  {
    id: 63,
    name: "javascript",
    label: "JavaScript",
    monacoLanguage: "javascript",
    defaultCode: `console.log("Hello, world!");`,
    preview: "script",
  },
  {
    id: 100,
    name: "react",
    label: "React (JSX)",
    monacoLanguage: "javascript",
    defaultCode: `import React from "react";\nimport { renderToString } from "react-dom/server";\n\nfunction App() {\n  return <h1>Hello, world!</h1>;\n}\n\nconsole.log(renderToString(<App />));`,
    preview: "react",
  },
  {
    id: 101,
    name: "html",
    label: "HTML",
    monacoLanguage: "html",
    defaultCode: `<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <title>Hello, world!</title>\n  </head>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>`,
    preview: "html",
  },
  {
    id: 102,
    name: "css",
    label: "CSS",
    monacoLanguage: "css",
    defaultCode: `body {\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  padding: 32px;\n}\n\nh1 {\n  color: #22c55e;\n}\n\nbutton {\n  background: #22c55e;\n  color: #0f172a;\n  border: none;\n  border-radius: 8px;\n  padding: 10px 20px;\n  font-size: 16px;\n}`,
    preview: "css",
  },
  {
    id: 103,
    name: "web",
    label: "Web (HTML + CSS)",
    monacoLanguage: "html",
    defaultCode: `<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My Page</title>\n  </head>\n  <body>\n    <main class="card">\n      <h1>Hello, world!</h1>\n      <p>Edit the HTML and CSS files — the preview updates live.</p>\n      <button>Click me</button>\n    </main>\n  </body>\n</html>`,
    preview: "web",
    files: [
      {
        name: "index.html",
        monacoLanguage: "html",
        defaultCode: `<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My Page</title>\n  </head>\n  <body>\n    <main class="card">\n      <h1>Hello, world!</h1>\n      <p>Edit the HTML and CSS files — the preview updates live.</p>\n      <button>Click me</button>\n    </main>\n  </body>\n</html>`,
      },
      {
        name: "styles.css",
        monacoLanguage: "css",
        defaultCode: `body {\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  padding: 32px;\n  margin: 0;\n}\n\n.card {\n  max-width: 560px;\n  margin: 0 auto;\n  background: #1e293b;\n  border-radius: 16px;\n  padding: 32px;\n  text-align: center;\n}\n\nh1 {\n  color: #22c55e;\n  margin-top: 0;\n}\n\nbutton {\n  background: #22c55e;\n  color: #0f172a;\n  border: none;\n  border-radius: 8px;\n  padding: 10px 20px;\n  font-size: 16px;\n  cursor: pointer;\n}`,
      },
    ],
  },
  {
    id: 74,
    name: "typescript",
    label: "TypeScript",
    monacoLanguage: "typescript",
    preview: "script",
    defaultCode: `function twoSum(nums: number[], target: number): number[] {\n  const map = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement)!, i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
  },
  {
    id: 71,
    name: "python",
    label: "Python",
    monacoLanguage: "python",
    defaultCode: `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []\n\nprint(two_sum([2, 7, 11, 15], 9))`,
  },
  {
    id: 60,
    name: "go",
    label: "Go",
    monacoLanguage: "go",
    defaultCode: `package main\n\nimport "fmt"\n\nfunc twoSum(nums []int, target int) []int {\n    seen := make(map[int]int)\n    for i, num := range nums {\n        complement := target - num\n        if idx, ok := seen[complement]; ok {\n            return []int{idx, i}\n        }\n        seen[num] = i\n    }\n    return []int{}\n}\n\nfunc main() {\n    fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))\n}`,
  },
  {
    id: 73,
    name: "rust",
    label: "Rust",
    monacoLanguage: "rust",
    defaultCode: `use std::collections::HashMap;\n\nfn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {\n    let mut seen = HashMap::new();\n    for (i, &num) in nums.iter().enumerate() {\n        let complement = target - num;\n        if let Some(&j) = seen.get(&complement) {\n            return vec![j as i32, i as i32];\n        }\n        seen.insert(num, i);\n    }\n    vec![]\n}\n\nfn main() {\n    println!(\"{:?}\", two_sum(vec![2, 7, 11, 15], 9));\n}`,
  },
  {
    id: 62,
    name: "java",
    label: "Java",
    monacoLanguage: "java",
    defaultCode: `import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[]{ map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n\n    public static void main(String[] args) {\n        Solution s = new Solution();\n        System.out.println(Arrays.toString(s.twoSum(new int[]{2, 7, 11, 15}, 9)));\n    }\n}`,
  },
  {
    id: 54,
    name: "cpp",
    label: "C++",
    monacoLanguage: "cpp",
    defaultCode: `#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) {\n            return {seen[complement], i};\n        }\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    int target = 9;\n    auto result = twoSum(nums, target);\n    cout << "[" << result[0] << ", " << result[1] << "]" << endl;\n    return 0;\n}`,
  },
  {
    id: 50,
    name: "c",
    label: "C",
    monacoLanguage: "c",
    defaultCode: `#include <stdio.h>\n\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    static int result[2];\n    for (int i = 0; i < numsSize; i++) {\n        for (int j = i + 1; j < numsSize; j++) {\n            if (nums[i] + nums[j] == target) {\n                result[0] = i;\n                result[1] = j;\n                *returnSize = 2;\n                return result;\n            }\n        }\n    }\n    *returnSize = 0;\n    return NULL;\n}\n\nint main() {\n    int nums[] = {2, 7, 11, 15};\n    int target = 9;\n    int returnSize;\n    int* result = twoSum(nums, 4, target, &returnSize);\n    if (returnSize == 2) {\n        printf(\"[%d, %d]\\n\", result[0], result[1]);\n    }\n    return 0;\n}`,
  },
  {
    id: 72,
    name: "ruby",
    label: "Ruby",
    monacoLanguage: "ruby",
    defaultCode: `def two_sum(nums, target)\n  seen = {}\n  nums.each_with_index do |num, i|\n    complement = target - num\n    if seen.key?(complement)\n      return [seen[complement], i]\n    end\n    seen[num] = i\n  end\n  []\nend\n\np two_sum([2, 7, 11, 15], 9)`,
  },
  {
    id: 68,
    name: "php",
    label: "PHP",
    monacoLanguage: "php",
    defaultCode: `<?php\nfunction twoSum($nums, $target) {\n    $seen = [];\n    for ($i = 0; $i < count($nums); $i++) {\n        $complement = $target - $nums[$i];\n        if (isset($seen[$complement])) {\n            return [$seen[$complement], $i];\n        }\n        $seen[$nums[$i]] = $i;\n    }\n    return [];\n}\n\n$result = twoSum([2, 7, 11, 15], 9);\nprint_r($result);\n?>`,
  },
];

export const getLanguageByName = (name: string): LanguageMeta | undefined => {
  return LANGUAGES.find((lang) => lang.name === name);
};

export const getLanguageByMonaco = (monacoLang: string): LanguageMeta | undefined => {
  return LANGUAGES.find((lang) => lang.monacoLanguage === monacoLang);
};

/** Resolve a stored room.language value (prefers the unique `name` key, falls back to monaco key for legacy rooms). */
export const getLanguage = (key: string): LanguageMeta | undefined => {
  // Legacy alias: rooms created when "jsx" was a valid stored value map to
  // the React entry so defaults/formatting/preview keep working everywhere.
  const normalized = key === "jsx" ? "react" : key;
  return getLanguageByName(normalized) ?? getLanguageByMonaco(normalized);
};

export const getLanguageById = (id: number): LanguageMeta | undefined => {
  return LANGUAGES.find((lang) => lang.id === id);
};

/**
 * File list for a room language. Multi-file modes (Web) return their
 * defined files; single-file languages synthesize one entry so the editor
 * and preview can treat every mode uniformly.
 */
export const getRoomFiles = (key: string): RoomFile[] => {
  const meta = getLanguage(key);
  if (!meta) {
    return [{ name: "main.txt", monacoLanguage: "plaintext", defaultCode: "" }];
  }
  if (meta.files?.length) return meta.files;
  const ext = meta.monacoLanguage === "plaintext" ? "txt" : meta.monacoLanguage;
  return [
    { name: `main.${ext}`, monacoLanguage: meta.monacoLanguage, defaultCode: meta.defaultCode ?? "" },
  ];
};

/** Language `name` keys supported by the Format feature (Prettier). */
export const FORMATTABLE_LANGUAGES: ReadonlySet<string> = new Set([
  "javascript",
  "react",
  "typescript",
]);
