// N.B. this helps avoid audio context issues

export const Start = class extends Phaser.Scene {
    constructor() {
        super('Start')
    }

    create() {
        this.input.mouse.disableContextMenu()

        this.add.text(0, 250, 'Homicidal Tendencies', {
            align: 'center',
            color: '#fff',
            fontFamily: 'Ubuntu',
            fontSize: 100,
            fixedWidth: 1600,
            shadow: {
                color: '#555',
                offsetX: 5,
                offsetY: 5,
                fill: true,
            }
        })

        this.add.text(0, 700, 'Press any key to continue...', {
            align: 'center',
            color: '#fff',
            fontFamily: 'Ubuntu',
            fontSize: 30,
            fixedWidth: 1600,
        })

        this.input.on('pointerdown', () => this.scene.start('Play'))
        this.input.keyboard.on('keydown', () => this.scene.start('Play'))
    }
}
