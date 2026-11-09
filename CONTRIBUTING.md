# Contributing to MERIDIAN

Thank you for your interest in contributing to **MERIDIAN — The Autonomous Agent Economy on NEAR Protocol**.

## Development Setup

1. **Prerequisites**:
   - Node.js (v18+) & npm
   - Rust & Cargo (1.80+) with `wasm32-unknown-unknown` target
   - Git

2. **Clone and Install**:
   ```bash
   git clone https://github.com/your-username/meridian.git
   cd meridian
   npm install
   ```

3. **Database Setup**:
   ```bash
   npm run prisma:push
   npm run prisma:seed
   ```

4. **Compile Smart Contract**:
   ```bash
   powershell -File ./contracts/build.ps1
   ```

5. **Run Test Suites**:
   ```bash
   npm test
   ```

6. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## Code Standards
- Keep business logic deterministic outside of LLM prompts.
- Never use floating-point numbers for NEAR currency.
- Preserve type safety with TypeScript strict mode.
- Ensure all tests pass before submitting a pull request.
