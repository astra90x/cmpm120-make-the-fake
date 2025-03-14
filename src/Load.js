export const Load = class extends Phaser.Scene {
    constructor() {
        super('Load')
    }

    preload() {
        this.gfx = this.add.graphics()

        this.load.font('Ubuntu', 'assets/Ubuntu-Bold.ttf', 'truetype')
        let ids = ['bag', ['l', 'r'].map(f => ['1', '2', '3', '4'].map(i => `footstep${i}${f}`)), 'gasp', 'stab', 'thud', 'wrap'].flat(Infinity)
        for (let id of ids)
            this.load.audio(id, `assets/audio/${id}.mp3`)

        this.load.on('progress', progress => {
            this.gfx.clear()
            this.gfx.fillStyle(0x333333)
            this.gfx.fillRect(800 - 600 / 2, 450 - 10 / 2, 600, 10)
            this.gfx.fillStyle(0xffffff)
            this.gfx.fillRect(800 - 600 / 2, 450 - 10 / 2, 600 * progress, 10)
        })
    }

    create() {
        this.scene.start('Start')
    }
}
