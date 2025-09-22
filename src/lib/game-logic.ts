import { CellState, Player, GameState } from "@/types/game"

export function createEmptyBoard(size: number = 15): CellState[][] {
  return Array(size).fill(null).map(() => Array(size).fill(null))
}

export function createInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    winner: null,
    isGameOver: false,
    moveHistory: []
  }
}

export function checkWinner(board: CellState[][], row: number, col: number, player: Player): boolean {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ]

  for (const [dx, dy] of directions) {
    let count = 1 // count the current piece

    // Check in positive direction
    let r = row + dx
    let c = col + dy
    while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
      count++
      r += dx
      c += dy
    }

    // Check in negative direction
    r = row - dx
    c = col - dy
    while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
      count++
      r -= dx
      c -= dy
    }

    if (count >= 5) {
      return true
    }
  }

  return false
}

export function makeMove(gameState: GameState, row: number, col: number): GameState {
  // Check if move is valid
  if (gameState.isGameOver || gameState.board[row][col] !== null) {
    return gameState
  }

  // Create new board with the move
  const newBoard = gameState.board.map(r => [...r])
  newBoard[row][col] = gameState.currentPlayer

  // Check for winner
  const winner = checkWinner(newBoard, row, col, gameState.currentPlayer) 
    ? gameState.currentPlayer 
    : null

  // Check for draw (board full)
  const isBoardFull = newBoard.every(row => row.every(cell => cell !== null))
  const isGameOver = winner !== null || isBoardFull

  return {
    board: newBoard,
    currentPlayer: gameState.currentPlayer === 'black' ? 'white' : 'black',
    winner,
    isGameOver,
    moveHistory: [
      ...gameState.moveHistory,
      { row, col, player: gameState.currentPlayer }
    ]
  }
}

export function undoLastMove(gameState: GameState): GameState {
  if (gameState.moveHistory.length === 0) {
    return gameState
  }

  const newMoveHistory = [...gameState.moveHistory]
  const lastMove = newMoveHistory.pop()!

  // Rebuild board from move history
  const newBoard = createEmptyBoard()
  newMoveHistory.forEach(move => {
    newBoard[move.row][move.col] = move.player
  })

  return {
    board: newBoard,
    currentPlayer: lastMove.player,
    winner: null,
    isGameOver: false,
    moveHistory: newMoveHistory
  }
}