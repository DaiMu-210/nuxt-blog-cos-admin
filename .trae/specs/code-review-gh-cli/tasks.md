# Tasks
- [x] Task 1: 检查仓库及 gh 命令行状态
  - [x] SubTask 1.1: 运行 `gh auth status` 确认认证。
  - [x] SubTask 1.2: 获取当前仓库信息及所有打开的 Pull Requests（`gh pr list`）。
- [x] Task 2: 获取并审查代码变更
  - [x] SubTask 2.1: 选择一个待审查的 PR（如果有）或本地的最近变更，并使用 `gh pr diff` 获取其变更差异。
  - [x] SubTask 2.2: 使用子智能体（如 search agent）或内部逻辑对提取的差异进行代码审查，分析规范性、安全性和潜在 bug。
- [x] Task 3: 汇总审查报告
  - [x] SubTask 3.1: 将最终的审查意见反馈给用户。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
