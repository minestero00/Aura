# PRD: MVP Mobile AI Assistant for Daily Briefings

## 1. Product Summary

### Working Title
Aura

### Product Vision
Build a mobile-first AI assistant that helps people stay informed and organized by turning fragmented personal and public information into a simple daily briefing.

### Core Promise
Users open one app and quickly understand:
- what happened in the world today
- what matters in their inbox
- what needs attention next

### Platform
React Native app for iOS and Android.

### Authentication
Google account login is required for all users.

### AI Provider
Anthropic API powers summarization, extraction, question answering, and personalized brief generation.

## 2. Problem Statement

People check multiple apps every day to understand what matters:
- news apps for current events
- Gmail for unread emails
- calendars and notes for priorities

This workflow is noisy, repetitive, and mentally expensive. Most information is not actionable by itself. Users need a product that filters, summarizes, and prioritizes information in a trustworthy way.

## 3. Goals

### Business Goals
- Launch a narrow but useful v1 with a repeatable daily habit
- Validate that users trust AI-generated briefings enough to return daily
- Create a base for future premium features without building them in MVP

### User Goals
- Get a concise daily news summary
- Understand important emails without reading every thread
- Know which emails likely need a reply soon
- Ask simple follow-up questions in natural language

### Product Goals
- Deliver a useful first briefing within 2 minutes of onboarding completion
- Load the home screen in under 3 seconds after data is prepared
- Keep setup friction low with Google-only onboarding
- Provide transparent source links and evidence context

## 4. Non-Goals for MVP

- Full email client functionality
- Sending emails on behalf of the user
- Voice-first assistant experience
- Calendar integration
- Deep enterprise workflows such as Slack, Jira, or CRM integration
- Open-ended autonomous agents that take actions without approval
- Long-term memory across weeks or months of user behavior
- Cross-platform web app

## 5. Target Users

### Primary Segment
Busy professionals and students who use Gmail and want a faster way to process daily information.

### Secondary Segment
People who feel overloaded by news and inbox volume but still want to stay informed.

## 6. Key Use Cases

1. A user logs in with Google, connects Gmail permissions, and receives a morning briefing.
2. A user opens the app during the day and asks, "What are the most important emails today?"
3. A user wants a short and neutral summary of major news across chosen categories.
4. A user asks the assistant, "Do I have anything urgent to reply to?"
5. A user checks a simple evening wrap-up showing unanswered important emails and major news updates.

## 7. Product Principles

- Utility first: every screen should help the user decide or act.
- Trustworthy summaries: include source references and distinguish facts from AI interpretation.
- Low cognitive load: prioritize short, scannable outputs.
- Privacy by design: be explicit about what data is accessed, stored, and processed.
- User-controlled automation: suggestions are automatic, actions require permission.

## 8. Core Features

### 8.1 Google Login and Onboarding

Users authenticate with Google Sign-In.

Functional requirements:
- Sign in with Google on iOS and Android
- Request Gmail read-only permission during onboarding
- Explain why each permission is needed
- Let users continue in news-only mode if they decline Gmail

Why it matters:
- removes password friction
- enables Gmail-based briefing

### 8.2 Daily News Briefing

The app generates a concise summary of major news in categories selected by the user.

Functional requirements:
- pull articles from curated news feeds or licensed providers
- generate one morning briefing and one evening update per day
- support a small fixed category set for MVP: world, business, tech
- allow users to choose summary length: short or standard
- show source links for every major news item

Assistant behavior:
- summarize without sensationalism
- highlight why a story matters
- answer follow-up questions about the news in the current session

### 8.3 Gmail Summary and Prioritization

The app summarizes recent emails and identifies what needs attention.

Functional requirements:
- ingest recent inbox metadata and message content from Gmail with user permission
- group related threads
- identify important emails based on sender, recency, and content
- generate summaries for unread and recent important threads
- extract action items, deadlines, and follow-up needs
- allow users to mark summaries as helpful or not helpful
- process only a limited recent window for MVP, such as the last 3 to 7 days

Assistant outputs:
- "3 emails need your attention"
- "2 messages mention deadlines this week"
- "This thread likely needs a response today"

### 8.4 Unified Daily Brief

A single home screen combines public and personal context.

Functional requirements:
- show top news
- show top email items
- show top action items
- show a personalized "today matters" summary generated by Anthropic
- refresh manually and on app open
- clearly separate news content from personal inbox content

### 8.5 Conversational Ask Mode

Users can chat with the assistant about their news and email context.

Functional requirements:
- support simple questions across connected data
- ground answers in retrieved news and Gmail data
- provide citations or linked evidence
- maintain short-term session context only

Example prompts:
- "Summarize my important emails in one paragraph"
- "What happened in AI news today?"
- "Which email should I reply to first?"

## 9. Recommended Additional Features

These are intentionally out of MVP, but they are the strongest next candidates if v1 shows retention.

### 9.1 Calendar Agenda
- Connect Google Calendar
- Show today's meetings and preparation notes
- Merge meeting schedule with email and news context

### 9.2 Smart Reply Drafts
- Generate reply suggestions for important emails
- User reviews and sends manually in Gmail or a later in-app send flow

### 9.3 Action Center
- Collect tasks extracted from emails
- Let users snooze, complete, or save items
- Create a simple "today / later" workflow

### 9.4 Push Briefings
- Morning push: daily briefing is ready
- Midday push: urgent email detected
- Evening push: wrap-up summary

### 9.5 Preference Memory
- Remember favorite news topics, ignored senders, preferred summary style, and work hours
- Improve ranking and personalization over time

## 10. MVP Scope

### In Scope
- React Native mobile app
- Google Sign-In
- Optional Gmail read-only integration
- News ingestion and summarization
- Unified daily brief home screen
- Conversational chat over current news and Gmail context
- Push notifications for briefing readiness

### Out of Scope
- Google Calendar integration
- Write-back to Gmail
- Voice mode
- Web app
- Team collaboration features
- Paid subscription system
- Advanced personalization based on long-term learning
- Multi-account inbox support
- Offline mode

## 11. User Journey

### Onboarding
1. User installs the app
2. User signs in with Google
3. User optionally grants Gmail read-only access
4. User selects news interests
5. App generates first briefing

### Daily Usage
1. User receives morning push
2. User opens the home screen
3. User scans top news, important emails, and action items
4. User taps into chat for follow-up questions
5. User returns in the evening for wrap-up

## 12. MVP Definition

The MVP is successful if a new user can:
- sign in with Google
- optionally connect Gmail
- receive a useful morning briefing
- understand at least the top 3 news items and top important emails
- ask at least one follow-up question with grounded answers

The MVP is not required to:
- write or send emails
- remember long-term preferences automatically
- connect more than one Google account
- support complex multi-step assistant workflows

## 13. Functional Requirements

### Mobile App
- React Native app supports iOS and Android
- Authentication state persists securely
- Push notifications are supported
- Screens load quickly on average mobile networks
- Briefing screen should function even if Gmail is not connected

### Backend
- Securely store tokens and refresh credentials
- Sync Gmail data on a schedule and on demand
- Ingest and normalize news content
- Run retrieval + prompt orchestration for Anthropic requests
- Log prompt and model usage for observability and cost control
- Cache generated briefings to reduce repeat cost and latency

### AI Layer
- Use retrieval-augmented generation for grounded answers
- Separate summarization prompts for news, email, and unified briefing
- Apply safety filters for harmful or sensitive outputs
- Support feedback loop for summary quality improvement

## 14. UX Requirements

- Home screen should be readable in under 30 seconds
- Summary cards should be short and expandable
- Important items should be visually distinct from informational items
- Citations and source links should be easy to access
- Permission requests should be clear and minimal
- Empty states should explain the value of connecting Gmail without blocking the user

## 15. Privacy, Security, and Compliance

- Use OAuth with least-privilege scopes
- Request Gmail read-only scope for MVP
- Encrypt tokens and sensitive user data at rest and in transit
- Provide clear consent screens explaining data use
- Let users disconnect Google account and delete data
- Minimize long-term storage of raw email bodies where possible
- Maintain auditability for AI-generated outputs tied to user data

Open compliance consideration:
- Gmail API usage and storing email-derived data may require additional review against Google's API Services User Data Policy.

## 16. Success Metrics

### Activation
- onboarding completion rate
- Gmail connection rate
- first briefing generated successfully

### Engagement
- daily active users
- morning briefing open rate
- average sessions per user per day
- number of chat questions per active user

### Quality
- summary helpfulness rating
- citation click-through rate
- percentage of users who say prioritization was accurate

### Retention
- Day 1, Day 7, Day 30 retention

### MVP Target Benchmarks
- 60%+ onboarding completion
- 40%+ Gmail connection among new users
- 70%+ successful first-brief generation
- 25%+ Day 7 retention for users who receive a first briefing

## 17. Risks and Mitigations

### Risk: Users do not trust AI summaries
Mitigation:
- show source links
- distinguish summary from recommendation
- provide easy feedback controls

### Risk: Gmail permissions feel invasive
Mitigation:
- use read-only scope
- explain value clearly at permission time
- let users use news-only mode if they decline Gmail

### Risk: Hallucinated or weak prioritization
Mitigation:
- ground outputs in retrieved content
- keep explanations tied to evidence
- tune ranking logic separate from generative layer

### Risk: API cost scales quickly
Mitigation:
- cache summaries
- use lightweight models where possible
- limit refresh frequency

## 18. Suggested Technical Approach

### Frontend
- React Native
- Expo if it supports required Google auth and notification flows cleanly, otherwise bare React Native
- State management with a lightweight predictable pattern

### Backend
- Node.js or Python API service
- PostgreSQL for user state and metadata
- Background job system for sync and briefing generation

### Integrations
- Google OAuth
- Gmail API
- News provider or RSS aggregation pipeline
- Anthropic API
- Push notification provider

## 19. Release Plan

### Phase 1
- Google login
- optional Gmail connect
- basic news summary
- basic email summary

### Phase 2
- unified home briefing
- conversational ask mode
- push notifications

### Phase 3
- action center
- personalization improvements
- calendar integration

## 20. Recommended Build Order

1. Google Sign-In and onboarding
2. News ingestion and morning briefing generation
3. Optional Gmail read-only integration
4. Home screen with combined briefing cards
5. Simple grounded chat on top of current briefing data
6. Push notifications for morning briefing readiness

## 21. Open Questions

- Should the first release target iOS first, or iOS and Android together?
- Should email summaries be generated on device open, on schedule, or both?
- What news content source will be used commercially?
- How much email history should be processed initially?
- Should the first version limit Gmail sync to primary inbox only?

## 22. Product Positioning

Aura is not a general chatbot. It is a personal daily briefing assistant that combines public information and private context to help users understand what matters and what to do next.
