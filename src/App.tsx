import { useEffect, useState } from 'react'
import { unlockAudio } from './audio/sfx'
import { TitleScreen } from './ui/TitleScreen'
import { HelpModal } from './ui/HelpModal'
import { GameTable } from './ui/GameTable'
import { OnlineGame } from './ui/OnlineGame'
import { DogCatalog } from './ui/DogCatalog'

type Screen =
  | { name: 'title' }
  | { name: 'local' }
  | { name: 'cpu' }
  | { name: 'online-create' }
  | { name: 'online-join' }
  | { name: 'catalog' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <>
      {screen.name === 'title' && (
        <TitleScreen
          onLocal={() => setScreen({ name: 'local' })}
          onCpu={() => setScreen({ name: 'cpu' })}
          onOnlineCreate={() => setScreen({ name: 'online-create' })}
          onOnlineJoin={() => setScreen({ name: 'online-join' })}
          onCatalog={() => setScreen({ name: 'catalog' })}
          onHelp={() => setHelp(true)}
        />
      )}
      {screen.name === 'local' && (
        <GameTable mode="local" onExit={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'cpu' && (
        <GameTable mode="cpu" onExit={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'online-create' && (
        <OnlineGame mode="create" onExit={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'online-join' && (
        <OnlineGame mode="join" onExit={() => setScreen({ name: 'title' })} />
      )}
      {screen.name === 'catalog' && (
        <DogCatalog onBack={() => setScreen({ name: 'title' })} />
      )}
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </>
  )
}
