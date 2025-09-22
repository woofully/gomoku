export type Player = 'black' | 'white'
export type CellState = Player | null

export interface GameState {
  board: CellState[][]
  currentPlayer: Player
  winner: Player | null
  isGameOver: boolean
  moveHistory: { row: number; col: number; player: Player }[]
}

export interface GameRoom {
  id: string
  players: {
    black?: {
      id: string
      name: string
      image?: string
    }
    white?: {
      id: string
      name: string
      image?: string
    }
  }
  gameState: GameState
  createdAt: Date
  updatedAt: Date
}