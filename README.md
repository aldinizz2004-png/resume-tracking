# ProGineer Resume Tracking System

A small recruitment dashboard for HR to follow candidates from application to decision. Built with TypeScript (strict), HTML, CSS and Bootstrap 5. No framework. Data comes from a JSON Server REST API.

## Run it

```bash
npm install
npm run build
npm run api
npm run web
```

Open `http://localhost:5500`. The API runs on `http://localhost:3000`.

## Features

- List candidates with name, email, phone, position, application date and status
- Add, edit and delete candidates, with validation
- Details panel with a status control (Submitted, UnderReview, Interview, Accepted, Rejected)
- Interview needs a date, rejection can carry a reason
- Search by name, filter by position and status, sort by application date, pagination

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/candidates` | List candidates |
| GET | `/candidates/:id` | One candidate |
| POST | `/candidates` | Create |
| PUT | `/candidates/:id` | Replace |
| PATCH | `/candidates/:id` | Update status only: `{ "status": { "name": "Interview", "interviewDate": "2026-12-01" } }` |
| DELETE | `/candidates/:id` | Delete |

## TypeScript concepts used

| Concept | Where |
| --- | --- |
| Interfaces | `Candidate`, `Entity`, `CandidateFilters` in `src/types.ts` |
| Type aliases | `Position`, `StatusName`, `SortOrder` |
| Union types and narrowing | `Position \| 'all'`, `isPosition`, `isStatusName` type guards |
| Discriminated unions | `ApplicationStatus` (by `name`), `ApiResult<T>`, `ParseResult<T>`; `switch` with an exhaustive `assertNever` |
| Functions and callbacks | `filterCandidates`, `sortBy(items, key)`, `countBy(items, getKey)` |
| Generics | `request<T>`, `createRepository<T, TInput>`, `findById<T extends Entity>`, `paginate<T>`, `byId<T>` |
| Utility types | `Omit` (`CandidateInput`), `Partial` (`CandidateUpdate`), `Pick` (`CandidateSummary`), `Record`, `Partial<Record>` (`FieldErrors`) |
| Typed API responses | `Repository<T, TInput>` returns `Promise<ApiResult<T>>` |

## Structure

```
src/types.ts       types and interfaces
src/utils.ts       generic helpers
src/candidates.ts  search, filter, sort, validation, status rules
src/api.ts         typed REST client
src/ui.ts          DOM rendering
src/main.ts        state and events
```
