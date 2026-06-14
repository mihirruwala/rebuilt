'use client'

export default function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div style={{
      position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',
      background:'var(--g1)',border:'1px solid var(--g2)',padding:'12px 20px',
      borderRadius:6,fontSize:12,zIndex:1000,whiteSpace:'nowrap',
      fontFamily:"'DM Mono',monospace",
    }}>
      {message}
    </div>
  )
}
