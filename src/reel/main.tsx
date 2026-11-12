import ReactDOM from 'react-dom/client'
import { Reel } from './Reel'
import './reel.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<Reel />)

// scale the 1080x1920 frame to fit the window (1 when the exporter renders at full size)
const fit = () => document.documentElement.style.setProperty('--fit', String(Math.min(innerWidth / 1080, innerHeight / 1920)))
fit()
addEventListener('resize', fit)
