# Strategy Board Game — Rulebook

This rulebook describes how to play the game **exactly as implemented** in `index.html`, `styles.css`, and `game.js`. It is derived solely from those mechanics.

---

## 1. Overview

This is a two-player turn-based strategy game played on an 8×8 board. Players control colored pieces (Red and Black) and take turns moving them according to the rules below. The goal is to leave the opponent with **no remaining pieces** or **no legal moves**.

- **Red** starts at the bottom of the board and moves first.
- **Black** starts at the top of the board.

---

## 2. The Board

- The board is an **8×8** grid of squares.
- Squares **alternate** between light and dark colors.
- **Only dark squares are playable.** Light squares can never hold pieces and cannot be selected as destinations.
- In this implementation, a square at row `r` and column `c` (0-based from the top-left) is playable when `(r + c)` is odd.

Rows and columns are numbered from the top-left corner:

- Row 1 is the top row (Black’s near side).
- Row 8 is the bottom row (Red’s near side).

---

## 3. Pieces and Starting Position

Each player begins with **12 pieces**.

### Starting placement

Pieces are placed only on playable (dark) squares:

| Player | Starting rows (1-based) | Board side |
|--------|-------------------------|------------|
| Black  | Rows 1–3                | Top        |
| Red    | Rows 6–8                | Bottom     |

Empty playable squares in the middle two rows (rows 4–5) form the opening gap between the armies.

### Piece types

1. **Ordinary piece** — may move and capture only **diagonally forward**.
2. **Promoted piece (king)** — may move and capture **diagonally forward and backward**.

Promoted pieces are visually marked with a gold center on the piece.

---

## 4. Turns

- Players alternate turns.
- **Red moves first.**
- On your turn you must make exactly one legal action sequence:
  - a single non-capturing move, **or**
  - a capturing sequence (one or more mandatory jumps with the same piece).
- You may only move your own pieces.
- After a completed turn (including the end of any multi-jump), play passes to the opponent, unless the game has ended.

---

## 5. Movement (Non-Capturing)

An ordinary piece may move **one playable square diagonally forward** into an **empty** square.

### Forward direction

| Player | Forward direction |
|--------|-------------------|
| Red    | Toward the top of the board (decreasing row) |
| Black  | Toward the bottom of the board (increasing row) |

A promoted piece may move **one playable square diagonally** in **any** diagonal direction (forward or backward) into an empty square.

Non-capturing moves are only allowed when the current player has **no capturing move available** anywhere on the board (see §7).

---

## 6. Capturing (Jumping)

A capture is performed by **jumping over** an opposing piece.

### Capture requirements

A capture is legal when all of the following are true:

1. An opposing piece stands on a diagonally adjacent playable square.
2. The square immediately beyond that piece, continuing in the same diagonal direction, is **on the board**, **playable**, and **empty**.
3. The jumping piece is allowed to travel in that diagonal direction:
   - ordinary Red pieces: only forward (toward the top)
   - ordinary Black pieces: only forward (toward the bottom)
   - promoted pieces: any diagonal direction

### Effect of a capture

- The jumping piece lands on the empty square beyond the opponent.
- The jumped opposing piece is **removed from the board immediately**.

---

## 7. Mandatory Captures

Capturing is **compulsory**.

- If the current player has **any** legal capture available with any of their pieces, that player **must** make a capturing move.
- Non-capturing moves are illegal while a capture exists.
- The interface prevents illegal choices: pieces that cannot participate in a required capture cannot be usefully selected for a quiet move.

---

## 8. Multi-Jump Continuations

If, after completing a capture, the **same piece** has another legal capture available from its new square, the player **must continue jumping** with that piece.

Rules for continuations:

- The turn does **not** end until that piece has no further captures available.
- During a multi-jump, **only the piece that just captured** may move.
- Other pieces cannot be selected until the continuation is finished.
- Each jumped opponent is removed as soon as it is jumped.

### Promotion during a multi-jump

If a piece lands on its promotion row during a capturing sequence, it is promoted **immediately** on that landing square. If further captures are then available using its new promoted movement (including backward jumps), those captures remain mandatory and must be continued in the same turn.

---

## 9. Promotion

When any piece first reaches the **farthest row on the opponent’s side**, it is promoted:

| Player | Promotion row (1-based) |
|--------|-------------------------|
| Red    | Row 1 (top row)         |
| Black  | Row 8 (bottom row)      |

A promoted piece:

- remains under the same owner’s control
- may move one square diagonally in any diagonal direction
- may capture by jumping in any diagonal direction (subject to the normal capture rules)

Promotion is permanent for the remainder of the game.

---

## 10. How to Use the Interface

1. The status panel shows whose turn it is, piece counts, and guidance messages.
2. Click one of your pieces that has a legal move. Legal destination squares are highlighted:
   - **green marker** — non-capturing destination
   - **red marker** — capturing destination
3. Click a highlighted destination to complete the move (or the next jump).
4. Click the selected piece again to clear the selection (only when a multi-jump is not forcing that piece to continue).
5. Use **New Game** to reset the board to the starting position with Red to move.

Dark squares are clickable; light squares are not.

---

## 11. Winning and Ending the Game

The game ends when either condition is met after a completed turn resolution:

1. **No pieces left** — a player has 0 pieces remaining; the opponent wins.
2. **No legal moves** — the player who would move next has pieces but no legal non-capturing or capturing moves; that player loses and the opponent wins.

The status panel announces the winner. No further moves are accepted until **New Game** is pressed.

---

## 12. Summary of Invariants Enforced by the Code

- Pieces exist only on dark squares.
- Ordinary pieces never move or capture backward.
- Promoted pieces may move and capture in both forward and backward diagonal directions.
- Captures remove the jumped piece immediately.
- If any capture exists, quiet moves are unavailable.
- Multi-jumps must be completed with the same piece.
- Promotion occurs on reaching the far row and upgrades movement immediately.
- Red starts; players alternate thereafter until a win condition is detected.

---

## 13. Design Notes (for reviewers)

These notes describe intentional implementation choices that affect play:

- **Board orientation:** Black occupies the top three rows; Red occupies the bottom three; Red moves first.
- **Playable color:** Dark squares only, using the `(row + column) odd` pattern with the top-left square light.
- **Mandatory capture priority:** Global — any available capture on your turn forces a capturing choice; you may choose among legal capturing options.
- **Multi-jump + promotion:** Promotion is applied on landing before checking for further jumps, so a newly promoted piece may continue capturing with king directions in the same turn when such jumps exist.
