# 代码审查 (gh-cli) Spec

## Why
用户希望使用 GitHub CLI (`gh-cli` 技能) 对当前仓库进行代码审查，通过检索 Pull Requests 或本地代码变更来发现潜在问题，提高代码质量。

## What Changes
- 通过 GitHub CLI 工具获取当前仓库的 Pull Requests、Commits 或代码差异 (diff)。
- 提取待审查的代码变更。
- 对变更的代码执行静态审查，提供问题和改进建议。
- 将审查结果总结并反馈给用户。

## Impact
- Affected specs: 无 (纯读取与分析操作)。
- Affected code: 不主动修改代码，仅进行分析和输出报告。

## ADDED Requirements
### Requirement: 自动化代码审查流程
系统 SHALL 使用 `gh` 命令获取代码变更，并对这些变更进行审查。

#### Scenario: 审查拉取请求或本地代码
- **WHEN** 用户请求进行代码审查时
- **THEN** 系统能够检查仓库状态，获取待合并或最近的变更代码，并生成审查报告。
