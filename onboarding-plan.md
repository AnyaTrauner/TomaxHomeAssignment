# 30-Day Onboarding Plan for a Backend Developer

## Resources and Documentation

To help bridge good onboarding and the Python → Node.js transition, I would provide the following:

### Team Resources
- A list of key company employees and their areas of ownership (R&D, Product< Support, etc.).
- "Buddy" - a team member that will be availiable anytime for questions and assistance (can be me or someone Seniour from the team)

### Technical Resources
- Internal architecture documentation, including the system overview, service boundaries, and database schema.
- Backend style guide and code conventions.
- API documentation, such Swagger.
- Development workflow documentation covering branching strategy, best pracxtices and PR process, and CI/CD.

### Node.js Learning Resources
- Official Node.js documentation.
- A short internal guide on the stack we use, such as Express or NestJS patterns.
- Examples in our codebase of typical modules, including controller, service, and data-access layers.


### Week 1 – Environment, Architecture, and Node.js Basics
- Finish IT and HR tasks.
- **Kickoff** meeting with Team Lead - receive permissions and all needed resources, explanation about work methodology (Agile) and team standarts.
- Successfully set up the development environment ( Node.js, the package manager, the local database, and Docker,etc.) - with "buddy".
- Run the backend locally and execute the tests.
- Understand the high-level architecture of the system, including the main services, APIs, and database structure - schedule a meeting with Architect or Team Lead.
- Become familiar with the Node.js ecosystem, Express patterns, middleware, and `async`/`await` flows - self-learning.
- Complete at least one very small code change, such as a documentation fix, logging improvement, or minor bug fix.

### Week 2 – Code Basics and Conventions
- Understand the structure of the backend modules and the team’s coding conventions, navigating the repository and debugging locally - schedule a meeting with Team Lead.
- Learn how the team handles async flows, error handling, and testing - with "buddy".
- Successfully complete a small but real backend task that goes through the full lifecycle: implementation, tests, PR review, and deployment to staging.

### Week 3 – Independent Contribution
- Deliver one medium-size feature or improvement, such as a new endpoint or an enhancement to an existing service.
- Demonstrate confidence working with Node.js async patterns, including Promises and `async`/`await`.

### End of Week 4 – Independent Contribution
- Perform first code review.
- Understand monitoring, logging, and production workflows.
- Deliver first E2E feature.


## First Task

**Task:** Add logging and validation improvements to an existing API endpoint.

**Why this task:**
- Small enough to complete quickly.
- Requires reading real production code.
- Touches common backend concerns such as routing, validation, and logging.
- Lets the developer go through the full workflow: coding, testing, PR, review, and merge.

This gives early confidence and familiarity with the codebase.

## 1-on-1 During the First Month
Each meeting should be around questions:
- What went well? How do you feel?
- What is confusing or blocking? Do you receive help when needed?
- What should be improved in onboarding?

### Week 1 – Two Short Meetings
- **Kickoff (Day 1):** goals, expectations, and an overview of the system.
- **End-of-week check-in:** discuss challenges with the environment or Node.js concepts.

### Week 2 – One Meeting
- Focus on technical questions and early feedback.
- Review how comfortable they feel with the codebase.

### Week 3 – One Meeting
- Discuss ownership areas and where they want to grow.
- Identify opportunities for deeper contribution.

### Week 4 – One Meeting
- Reflect on the onboarding experience.
- Discuss next-quarter goals and responsibilities.

## Measuring Onboarding Success After 30 Days

Onboarding is successful if the developer can run and debug the backend independently, has successfully delivered at least 2–3 merged PRs, understands the main architecture and service responsibilities, feels comfortable asking questions and participating in discussions, and can estimate and implement small tasks with minimal guidance.

Success should be validated through code quality, review feedback from teammates, and the developer’s own confidence working in the system.
