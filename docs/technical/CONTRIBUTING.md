# Contributing to MERIDIAN

Thank you for your interest in contributing to **MERIDIAN — The Autonomous Agent Economy on NEAR Protocol**.

---

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

---

## Coding Standards

- **Deterministic Business Logic**: Keep financial accounting and scoring algorithms strictly deterministic outside of LLM prompts.
- **Integer Currency**: Always use integer yoctoNEAR (`10^24 yoctoNEAR = 1 NEAR`) for balance math. Floating-point numbers are prohibited in settlement code.
- **Type Safety**: Maintain TypeScript strict mode compliance across all components and API routes.
- **Security Defense**: Ensure new endpoints and agent actions validate inputs against Meridian Guard policies.
- **Tests**: Verify all tests pass (`npm test`) and production build succeeds (`npm run build`) before opening pull requests.
