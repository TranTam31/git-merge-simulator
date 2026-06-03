# Git Merge Conflict Simulator

A premium, interactive, web-based tool for developers to simulate, visualize, and resolve 3-way Git merge conflicts entirely inside the browser. No Git repository or local command line required.

Designed with a high-fidelity VSCode aesthetic, the simulator helps developers understand 3-way merge mechanics and safely practice or debug conflict resolutions.

## Key Features

- **VSCode-Fidelity Design**: Styled strictly in dark mode, utilizing curated themes and typography. Features Monaco Editor—the core editor driving VSCode—for all inputs, diffs, and merge results.
- **Accurate 3-Way Merge Engine**: Uses an LCS (Longest Common Subsequence) line-level alignment algorithm that matches Git’s conflict boundary rules (including edge cases such as trailing brace shifts).
- **Interactive CodeLens Actions**: Inject inline action buttons directly into conflict blocks (`Accept Current`, `Accept Incoming`, `Accept Both`, `Compare Changes`) to resolve conflicts instantly.
- **Fully Editable Merge Output**: The merge result is a fully live, editable Monaco Editor. Resolve conflicts using automated buttons or manually write code to fix syntax errors (e.g. combining conflicting functions) with full undo/redo (`Ctrl+Z` / `Ctrl+Y`) support.
- **Dynamic Conflict Parsing**: The editor parses conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) on-the-fly. The background decorations, inline action bars, and progress status update in real-time as you type or edit.
- **Side-by-Side File Comparisons**: Leverage Monaco DiffEditor modals to view color-coded, side-by-side comparisons of individual conflict blocks or compare the entire Current and Incoming files.
- **Client-Side Only**: 100% secure. All calculations and text processing run entirely inside the client’s browser. No data is sent to external servers.

---

## Technical Stack

- **Core**: React 19 + Vite 8
- **Styling**: Tailwind CSS (Dark Mode-first)
- **Editor & Diffs**: Monaco Editor (`@monaco-editor/react`)
- **Diffing Engine**: `diff-match-patch` (enhanced with custom prefix/suffix line boundaries to mirror standard Git behavior)

---

## How It Works: The 3-Way Merge

A three-way merge compares two modified versions of a file (your branch and another branch) against a common ancestor (where the branches diverged):

1. **BASE**: The common ancestor.
2. **CURRENT (HEAD)**: Your local branch’s version.
3. **INCOMING**: The branch you are merging in.

The engine automatically applies changes if only one side modified a line, and flags conflicts (injecting markers) if both sides modified the same line differently.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/git-merge-simulator.git
   cd git-merge-simulator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

To build the static application assets:
```bash
npm run build
```
The compiled output will be generated inside the `dist` directory and is ready for static deployment (e.g., Vercel, Netlify, GitHub Pages).

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
