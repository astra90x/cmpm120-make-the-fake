import { Load } from './Load.js'
import { Start } from './Start.js'
import { Play } from './Play.js'

new Phaser.Game({
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [Load, Start, Play],
})
