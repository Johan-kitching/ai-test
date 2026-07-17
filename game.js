/**
 * Browser-based strategy board game (checkers-style rules).
 * Game logic is kept separate from DOM rendering.
 */

const BOARD_SIZE = 8;
const PLAYERS = Object.freeze({
  RED: "red",
  BLACK: "black",
});

const DIRECTIONS = Object.freeze({
  [PLAYERS.RED]: [-1],
  [PLAYERS.BLACK]: [1],
});

const PROMOTION_ROWS = Object.freeze({
  [PLAYERS.RED]: 0,
  [PLAYERS.BLACK]: 7,
});

const PLAYER_LABELS = Object.freeze({
  [PLAYERS.RED]: "Red",
  [PLAYERS.BLACK]: "Black",
});

const DIAGONAL_OFFSETS = Object.freeze([
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
]);

// ---------------------------------------------------------------------------
// Initialization & game state
// ---------------------------------------------------------------------------

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

function isPlayableSquare(row, col) {
  return (row + col) % 2 === 1;
}

function createPiece(owner, isKing = false) {
  return { owner, isKing };
}

function clonePiece(piece) {
  return piece ? createPiece(piece.owner, piece.isKing) : null;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => clonePiece(piece)));
}

/**
 * Standard starting layout: each side fills the three nearest rows
 * on dark (playable) squares only.
 */
function createInitialBoard() {
  const board = createEmptyBoard();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isPlayableSquare(row, col)) {
        continue;
      }

      if (row <= 2) {
        board[row][col] = createPiece(PLAYERS.BLACK);
      } else if (row >= 5) {
        board[row][col] = createPiece(PLAYERS.RED);
      }
    }
  }

  return board;
}

function createInitialState() {
  return {
    board: createInitialBoard(),
    currentPlayer: PLAYERS.RED,
    selected: null,
    mandatoryPiece: null,
    winner: null,
    statusMessage: "Select a piece to begin.",
  };
}

function countPieces(board, player) {
  let count = 0;

  for (const row of board) {
    for (const piece of row) {
      if (piece?.owner === player) {
        count += 1;
      }
    }
  }

  return count;
}

function getOpponent(player) {
  return player === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getPiece(board, row, col) {
  if (!isInsideBoard(row, col)) {
    return null;
  }

  return board[row][col];
}

function positionsEqual(a, b) {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

// ---------------------------------------------------------------------------
// Move validation
// ---------------------------------------------------------------------------

function getMovementRowDeltas(piece) {
  if (piece.isKing) {
    return [-1, 1];
  }

  return [...DIRECTIONS[piece.owner]];
}

function isAllowedStepDirection(piece, rowDelta) {
  return getMovementRowDeltas(piece).includes(Math.sign(rowDelta) || rowDelta);
}

function buildMove({ fromRow, fromCol, toRow, toCol, captured = null }) {
  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    captured,
  };
}

function getSimpleMovesForPiece(board, row, col) {
  const piece = getPiece(board, row, col);
  if (!piece) {
    return [];
  }

  const moves = [];

  for (const offset of DIAGONAL_OFFSETS) {
    if (!isAllowedStepDirection(piece, offset.row)) {
      continue;
    }

    const toRow = row + offset.row;
    const toCol = col + offset.col;

    if (!isInsideBoard(toRow, toCol) || !isPlayableSquare(toRow, toCol)) {
      continue;
    }

    if (getPiece(board, toRow, toCol) !== null) {
      continue;
    }

    moves.push(
      buildMove({
        fromRow: row,
        fromCol: col,
        toRow,
        toCol,
      })
    );
  }

  return moves;
}

function getCaptureMovesForPiece(board, row, col) {
  const piece = getPiece(board, row, col);
  if (!piece) {
    return [];
  }

  const captures = [];

  for (const offset of DIAGONAL_OFFSETS) {
    if (!isAllowedStepDirection(piece, offset.row)) {
      continue;
    }

    const midRow = row + offset.row;
    const midCol = col + offset.col;
    const landRow = row + offset.row * 2;
    const landCol = col + offset.col * 2;

    if (!isInsideBoard(landRow, landCol) || !isPlayableSquare(landRow, landCol)) {
      continue;
    }

    const midPiece = getPiece(board, midRow, midCol);
    const landingPiece = getPiece(board, landRow, landCol);

    if (!midPiece || midPiece.owner === piece.owner || landingPiece !== null) {
      continue;
    }

    captures.push(
      buildMove({
        fromRow: row,
        fromCol: col,
        toRow: landRow,
        toCol: landCol,
        captured: { row: midRow, col: midCol },
      })
    );
  }

  return captures;
}

function getAllCaptureMoves(board, player, onlyPiece = null) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.owner !== player) {
        continue;
      }

      if (onlyPiece && !positionsEqual(onlyPiece, { row, col })) {
        continue;
      }

      moves.push(...getCaptureMovesForPiece(board, row, col));
    }
  }

  return moves;
}

function getAllSimpleMoves(board, player) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.owner !== player) {
        continue;
      }

      moves.push(...getSimpleMovesForPiece(board, row, col));
    }
  }

  return moves;
}

/**
 * Captures are mandatory. During a multi-jump, only the jumping piece may move,
 * and only its remaining captures are legal.
 */
function getLegalMoves(state) {
  const { board, currentPlayer, mandatoryPiece } = state;

  if (mandatoryPiece) {
    return getCaptureMovesForPiece(
      board,
      mandatoryPiece.row,
      mandatoryPiece.col
    );
  }

  const captures = getAllCaptureMoves(board, currentPlayer);
  if (captures.length > 0) {
    return captures;
  }

  return getAllSimpleMoves(board, currentPlayer);
}

function findMove(legalMoves, from, to) {
  return (
    legalMoves.find(
      (move) =>
        positionsEqual(move.from, from) && positionsEqual(move.to, to)
    ) || null
  );
}

function getMovesFromSquare(legalMoves, row, col) {
  return legalMoves.filter((move) =>
    positionsEqual(move.from, { row, col })
  );
}

// ---------------------------------------------------------------------------
// Captures, promotions, turns, and win detection
// ---------------------------------------------------------------------------

function shouldPromote(piece, row) {
  return !piece.isKing && row === PROMOTION_ROWS[piece.owner];
}

function applyPromotion(piece, row) {
  if (shouldPromote(piece, row)) {
    return createPiece(piece.owner, true);
  }

  return piece;
}

function applyMoveToBoard(board, move) {
  const nextBoard = cloneBoard(board);
  const movingPiece = nextBoard[move.from.row][move.from.col];

  nextBoard[move.from.row][move.from.col] = null;

  if (move.captured) {
    nextBoard[move.captured.row][move.captured.col] = null;
  }

  nextBoard[move.to.row][move.to.col] = applyPromotion(
    movingPiece,
    move.to.row
  );

  return nextBoard;
}

function playerHasAnyMoves(board, player) {
  return (
    getAllCaptureMoves(board, player).length > 0 ||
    getAllSimpleMoves(board, player).length > 0
  );
}

function detectWinner(board, playerAboutToMove) {
  if (countPieces(board, PLAYERS.RED) === 0) {
    return PLAYERS.BLACK;
  }

  if (countPieces(board, PLAYERS.BLACK) === 0) {
    return PLAYERS.RED;
  }

  if (!playerHasAnyMoves(board, playerAboutToMove)) {
    return getOpponent(playerAboutToMove);
  }

  return null;
}

function endTurn(state, boardAfterMove) {
  const nextPlayer = getOpponent(state.currentPlayer);
  const winner = detectWinner(boardAfterMove, nextPlayer);

  return {
    ...state,
    board: boardAfterMove,
    currentPlayer: winner ? state.currentPlayer : nextPlayer,
    selected: null,
    mandatoryPiece: null,
    winner,
    statusMessage: winner
      ? `${PLAYER_LABELS[winner]} wins!`
      : `${PLAYER_LABELS[nextPlayer]} to move.`,
  };
}

function continueMultiJump(state, boardAfterMove, piecePosition) {
  return {
    ...state,
    board: boardAfterMove,
    selected: { ...piecePosition },
    mandatoryPiece: { ...piecePosition },
    statusMessage:
      "Continue capturing with the same piece — another jump is required.",
  };
}

function executeMove(state, move) {
  const boardAfterMove = applyMoveToBoard(state.board, move);
  const movedPiece = boardAfterMove[move.to.row][move.to.col];

  if (move.captured) {
    const furtherCaptures = getCaptureMovesForPiece(
      boardAfterMove,
      move.to.row,
      move.to.col
    );

    // Promotion happens on landing; kings may reverse direction mid-combo.
    if (furtherCaptures.length > 0 && movedPiece) {
      return continueMultiJump(state, boardAfterMove, {
        row: move.to.row,
        col: move.to.col,
      });
    }
  }

  return endTurn(state, boardAfterMove);
}

function selectSquare(state, row, col) {
  if (state.winner) {
    return state;
  }

  const legalMoves = getLegalMoves(state);
  const piece = getPiece(state.board, row, col);

  if (state.mandatoryPiece) {
    const continuationMove = findMove(
      legalMoves,
      state.mandatoryPiece,
      { row, col }
    );

    if (continuationMove) {
      return executeMove(state, continuationMove);
    }

    return {
      ...state,
      statusMessage:
        "A multi-jump is in progress. You must continue with the highlighted piece.",
    };
  }

  if (state.selected && positionsEqual(state.selected, { row, col })) {
    return {
      ...state,
      selected: null,
      statusMessage: "Selection cleared.",
    };
  }

  if (state.selected) {
    const chosenMove = findMove(legalMoves, state.selected, { row, col });
    if (chosenMove) {
      return executeMove(state, chosenMove);
    }
  }

  if (piece && piece.owner === state.currentPlayer) {
    const pieceMoves = getMovesFromSquare(legalMoves, row, col);

    if (pieceMoves.length === 0) {
      const mustCapture = getAllCaptureMoves(
        state.board,
        state.currentPlayer
      ).length > 0;

      return {
        ...state,
        selected: null,
        statusMessage: mustCapture
          ? "A capture is available elsewhere. Capturing moves are mandatory."
          : "That piece has no legal moves.",
      };
    }

    return {
      ...state,
      selected: { row, col },
      statusMessage: pieceMoves.some((move) => move.captured)
        ? "Capture required. Choose a highlighted landing square."
        : "Choose a highlighted square to move.",
    };
  }

  return {
    ...state,
    selected: null,
    statusMessage: `${PLAYER_LABELS[state.currentPlayer]} to move. Select one of your pieces.`,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function createSquareButton(row, col) {
  const button = document.createElement("button");
  const playable = isPlayableSquare(row, col);

  button.type = "button";
  button.className = `square square--${playable ? "dark" : "light"}`;
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.setAttribute("role", "gridcell");
  button.setAttribute(
    "aria-label",
    playable
      ? `Playable square row ${row + 1}, column ${col + 1}`
      : `Non-playable square row ${row + 1}, column ${col + 1}`
  );

  if (playable) {
    button.classList.add("square--playable");
  } else {
    button.disabled = true;
    button.tabIndex = -1;
  }

  return button;
}

function renderBoardStructure(boardElement) {
  boardElement.replaceChildren();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      boardElement.appendChild(createSquareButton(row, col));
    }
  }
}

function createPieceElement(piece) {
  const element = document.createElement("span");
  element.className = `piece piece--${piece.owner}`;
  element.setAttribute("aria-hidden", "true");

  if (piece.isKing) {
    element.classList.add("piece--king");
  }

  return element;
}

function describePiece(piece) {
  const rank = piece.isKing ? "promoted piece" : "piece";
  return `${PLAYER_LABELS[piece.owner]} ${rank}`;
}

function updateSquareAppearance(button, state, legalMoves) {
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  const playable = isPlayableSquare(row, col);
  const piece = getPiece(state.board, row, col);

  button.classList.toggle(
    "square--selected",
    positionsEqual(state.selected, { row, col })
  );
  button.classList.remove("square--move-target", "square--capture-target");

  button.replaceChildren();

  if (piece) {
    button.appendChild(createPieceElement(piece));
    button.setAttribute(
      "aria-label",
      `${describePiece(piece)} on row ${row + 1}, column ${col + 1}`
    );
  } else if (playable) {
    button.setAttribute(
      "aria-label",
      `Empty playable square row ${row + 1}, column ${col + 1}`
    );
  }

  if (!playable || state.winner) {
    return;
  }

  const targets = legalMoves.filter((move) =>
    positionsEqual(move.to, { row, col })
  );

  if (targets.length === 0) {
    return;
  }

  const isCapture = targets.some((move) => move.captured);
  button.classList.toggle("square--move-target", !isCapture);
  button.classList.toggle("square--capture-target", isCapture);
}

function renderStatus(state, elements) {
  const { turnIndicator, message, redCount, blackCount } = elements;

  if (state.winner) {
    turnIndicator.textContent = `${PLAYER_LABELS[state.winner]} wins`;
    turnIndicator.dataset.player = "none";
  } else {
    turnIndicator.textContent = `${PLAYER_LABELS[state.currentPlayer]} to move`;
    turnIndicator.dataset.player = state.currentPlayer;
  }

  message.textContent = state.statusMessage;
  redCount.textContent = String(countPieces(state.board, PLAYERS.RED));
  blackCount.textContent = String(countPieces(state.board, PLAYERS.BLACK));
}

function render(state, elements) {
  const legalMoves = state.winner ? [] : getLegalMoves(state);
  const visibleMoves = state.selected
    ? getMovesFromSquare(
        legalMoves,
        state.selected.row,
        state.selected.col
      )
    : state.mandatoryPiece
      ? legalMoves
      : [];

  for (const button of elements.board.querySelectorAll(".square")) {
    updateSquareAppearance(button, state, visibleMoves);
  }

  renderStatus(state, elements);
}

// ---------------------------------------------------------------------------
// Application wiring
// ---------------------------------------------------------------------------

function getUiElements() {
  return {
    board: document.getElementById("board"),
    turnIndicator: document.getElementById("turn-indicator"),
    message: document.getElementById("message"),
    redCount: document.getElementById("red-count"),
    blackCount: document.getElementById("black-count"),
    newGameButton: document.getElementById("new-game-btn"),
  };
}

function createGameController(elements) {
  let state = createInitialState();

  function refresh() {
    render(state, elements);
  }

  function startNewGame() {
    state = createInitialState();
    refresh();
  }

  function handleSquareClick(event) {
    const button = event.target.closest(".square");
    if (!button || !elements.board.contains(button) || button.disabled) {
      return;
    }

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);
    state = selectSquare(state, row, col);
    refresh();
  }

  renderBoardStructure(elements.board);
  elements.board.addEventListener("click", handleSquareClick);
  elements.newGameButton.addEventListener("click", startNewGame);
  refresh();

  return {
    getState: () => state,
    startNewGame,
  };
}

function initializeGame() {
  const elements = getUiElements();

  if (!elements.board) {
    throw new Error("Board element was not found in the document.");
  }

  createGameController(elements);
}

initializeGame();
