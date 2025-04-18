---
description: APPLY MobX state management patterns WHEN managing application state
globs: apps/frontend/app/**/*.store.ts
alwaysApply: false
---

Store Organization:
- Group stores by domain feature
- Use class-based store structure
- Disallow MobX decorators
- Inject dependencies via constructor
- Provide stores to parent components

State and Actions:
- Use `makeAutoObservable` in constructor
- Use `get` for computed values
- Use `computed` for all derived state
- Use `action.bound` for callbacks
- Disallow magic values in state

Side Effects and Reactions:
- Use `runInAction` for async mutations
- Prefer `reaction` over `autorun`
- Isolate side effects in `reactions`

Testing Stores:
- Unit test every store
- Mock dependencies in tests
- Test `computed` and `reactions`
- Test only store logic
- Use strict, typed test params
