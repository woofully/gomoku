"use client"

import { CellState, Player } from "@/types/game"

interface BoardProps {
  board: CellState[][]
  onCellClick: (row: number, col: number) => void
  currentPlayer: Player
  disabled?: boolean
}

export function Board({ board, onCellClick, currentPlayer, disabled = false }: BoardProps) {
  const boardSize = 15

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-4 text-lg font-semibold">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
          currentPlayer === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          <div className="w-4 h-4 bg-black rounded-full"></div>
          <span>Black</span>
        </div>
        <span className="text-gray-400">vs</span>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
          currentPlayer === 'white' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
          <span>White</span>
        </div>
      </div>
      
      <div className="relative">
        <div 
          className="grid gap-0 bg-amber-100 p-4 rounded-lg shadow-lg"
          style={{ 
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gridTemplateRows: `repeat(${boardSize}, 1fr)`
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onCellClick(rowIndex, colIndex)}
                disabled={disabled || cell !== null}
                className="relative w-8 h-8 border border-amber-800/30 hover:bg-amber-200/50 transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  borderTop: rowIndex === 0 ? '2px solid #92400e' : undefined,
                  borderBottom: rowIndex === boardSize - 1 ? '2px solid #92400e' : undefined,
                  borderLeft: colIndex === 0 ? '2px solid #92400e' : undefined,
                  borderRight: colIndex === boardSize - 1 ? '2px solid #92400e' : undefined,
                }}
              >
                {cell && (
                  <div
                    className={`w-6 h-6 rounded-full shadow-md ${
                      cell === 'black' 
                        ? 'bg-gray-900 border border-gray-700' 
                        : 'bg-white border-2 border-gray-400'
                    }`}
                  />
                )}
                
                {/* Grid dots for star points */}
                {((rowIndex === 3 && (colIndex === 3 || colIndex === 11)) ||
                  (rowIndex === 7 && (colIndex === 7)) ||
                  (rowIndex === 11 && (colIndex === 3 || colIndex === 11))) && (
                  <div className="absolute w-1.5 h-1.5 bg-amber-800 rounded-full"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}