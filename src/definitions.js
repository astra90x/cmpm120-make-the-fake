export const Synth = class {
    constructor(ax = new AudioContext()) {
        this.ax = ax
        this.out = new GainNode(ax)
        this.out.connect(ax.destination)
        this.volume = 1
        this.hasPlayedNote = false

        this.instruments = new Map()

        this.createInstrument('piano', {
            gain: 0.25,
            harmonics: [1000, 800, 50, 160, 160, 160, 160, 70, 25, 25, 10, 100, 50, 10, 100, 12, 0, 0, 1, 1, 2, 4, 6, 8],
            inharmonicity: [
                { start: 0, end: 4, coefficient: 1 },
                { start: 4, end: 8, coefficient: 1.015625 },
                { start: 8, end: 16, coefficient: 1.03125 },
                { start: 16, end: 24, coefficient: 1.0625 },
            ],
            adsr: {
                attackDuration: 0.025,
                decayHalflife: 0.3,
                sustainLevel: 0,
                releaseDuration: 0.1,
            },
            lowpass(frequency, t) {
                frequency.setValueAtTime(3520, t)
                frequency.exponentialRampToValueAtTime(880, t + 0.025)
                frequency.exponentialRampToValueAtTime(660, t + 0.4)
            },
        })
    }

    setVolume(volume) {
        if (volume === this.volume) return
        this.volume = volume

        let rawVolume = volume * volume
        if (this.hasPlayedNote) {
            this.out.gain.setValueAtTime(rawVolume, this.ax.currentTime)
        } else {
            this.out.gain.linearRampToValueAtTime(rawVolume, this.ax.currentTime + 0.01)
        }
    }

    createInstrument(id, instrument) {
        let waves = []
        let scale = Math.max(...instrument.harmonics)
        for (let { start, end, coefficient } of instrument.inharmonicity) {
            let real = [0, ...instrument.harmonics.map((m, i) => i >= start && i < end ? m / scale : 0)]
            let imag = Array(real.length).fill(0)

            let wave = new PeriodicWave(this.ax, { real, imag, disableNormalization: true })
            waves.push({ wave, coefficient })
        }

        this.instruments.set(id, {
            ...instrument,
            waves,
        })
    }

    scheduleNote({ time, duration, frequency, gain: noteGain = 1, id = 'piano' }) {
        let { gain: iGain, waves, adsr, lowpass } = this.instruments.get(id)

        let startAt = time
        let peakAt = startAt + Math.min(duration / 2, adsr.attackDuration)
        let decayTau = adsr.decayHalflife / Math.LN2
        let releaseAt = time + duration
        let stopAt = releaseAt + adsr.releaseDuration
        let gain = iGain * noteGain

        let g = new GainNode(this.ax)
        g.gain.setValueAtTime(0, startAt)
        g.gain.linearRampToValueAtTime(gain, peakAt)
        g.gain.setTargetAtTime(gain * adsr.sustainLevel, peakAt, decayTau)
        g.gain.setValueAtTime(gain * (adsr.sustainLevel + (1 - adsr.sustainLevel) * Math.exp((peakAt - releaseAt) / decayTau)), releaseAt)
        g.gain.linearRampToValueAtTime(0, stopAt)
        g.connect(this.out)
        this.hasPlayedNote = true

        let l = new BiquadFilterNode(this.ax, {
            Q: 0,
        })
        lowpass(l.frequency, startAt)
        l.connect(g)

        for (let { wave, coefficient } of waves) {
            let o = new OscillatorNode(this.ax, {
                frequency: frequency * coefficient,
                periodicWave: wave,
            })
            o.start(startAt)
            o.stop(stopAt)
            o.connect(l)
        }
    }

    playNote(options) {
        this.scheduleNote({ ...options, time: this.ax.currentTime })
    }

    play(notes) {
        for (let note of notes) this.scheduleNote(note)
    }
}

let getSynth = () => {
    let synth = new Synth()
    getSynth = () => synth
    return synth
}

const BACKGROUND = 0
const FURNITURE = 1
const ITEM = 2
const CHARACTER = 3

export let player = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
    inventorySize: 8,
    inventoryActiveAt: { x: 30, y: 22, angle: 0 },
    render(cx, e) {
        // body
        cx.fillStyle(0xdf9778)
        cx.lineStyle(4, 0x444444)
        cx.fillCircle(0, 0, 28)
        cx.strokeCircle(0, 0, 28)

        // eyes
        cx.fillStyle(0x000000)
        cx.fillCircle(10, -6, 5)
        cx.fillCircle(10, 6, 5)

        cx.fillStyle(0xffffff)
        cx.fillCircle(10 + 1.5 * Math.cos(-e.angle - Math.PI / 2), -6 + 1.5 * Math.sin(-e.angle - Math.PI / 2), 2)
        cx.fillCircle(10 + 1.5 * Math.cos(-e.angle - Math.PI / 2), 6 + 1.5 * Math.sin(-e.angle - Math.PI / 2), 2)

        // hands
        cx.fillStyle(0xdf9778)
        cx.lineStyle(4, 0x444444)
        for (let [x, y, radius] of [
            [22, -22, 8],
            [22, 22, 8],
        ]) {
            cx.fillCircle(x, y, radius)
            cx.strokeCircle(x, y, radius)
        }
    },
    renderLayer: CHARACTER,
}

export let enemy = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
    inventorySize: 2,
    inventoryActiveAt: { x: 30, y: 18, angle: 0 },
    render(cx, e) {
        // body inner
        cx.fillStyle(0xefcab8)
        cx.fillCircle(0, 0, 28)

        // blood
        if (e.health < 0.95) {
            cx.fillStyle(0xcc0000, 0.7)
            cx.fillCircle(5, 1, Math.sqrt(1 - e.health / 0.95) * 15)
            if (e.health < 0.6) {
                cx.fillCircle(-6, -3, Math.sqrt(1 - e.health / 0.6) * 6)
            }
        }

        // eyes
        if (e.health === 0 || e.hasEffect('unconscious')) {
            cx.fillStyle(0x000000)
            cx.fillRect(10 - 1, -6 - 4, 2, 8)
            cx.fillRect(10 - 1, 6 - 4, 2, 8)
        } else {
            cx.fillStyle(0x000000)
            cx.fillCircle(10, -6, 5)
            cx.fillCircle(10, 6, 5)

            cx.fillStyle(0xffffff)
            cx.fillCircle(10 + 1.5 * Math.cos(-e.angle - Math.PI / 2), -6 + 1.5 * Math.sin(-e.angle - Math.PI / 2), 2)
            cx.fillCircle(10 + 1.5 * Math.cos(-e.angle - Math.PI / 2), 6 + 1.5 * Math.sin(-e.angle - Math.PI / 2), 2)
        }

        // bound
        if (e.hasEffect('bound')) {
            cx.fillStyle(0xdddddd, 0.7)
            cx.fillRect(-10, -27, 20, 54)
        }

        // body outer
        cx.lineStyle(4, 0x444444)
        cx.strokeCircle(0, 0, 28)

        // hands
        cx.fillStyle(0xefcab8)
        for (let [x, y, radius] of [
            [22, -22, 8],
            [22, 22, 8],
        ]) {
            cx.fillCircle(x, y, radius)
            cx.strokeCircle(x, y, radius)
        }
    },
    renderLayer: CHARACTER,
}

export let wall = {
    physics: { shape: 'rect' },
    render(cx, { width, height }) {
        cx.fillStyle(0x999999)
        cx.fillRect(-width / 2, -height / 2, width, height)
        cx.lineStyle(4, 0x444444)
        cx.strokeRoundedRect(-width / 2, -height / 2, width, height, 2)
    },
    renderLayer: BACKGROUND,
}

export let couch = {
    physics: { shape: 'rect' },
    width: 50,
    height: 90,
    render(cx, { width, height }) {
        cx.fillStyle(0x76030d)
        cx.fillRect(-width / 2, -height / 2, width, height)
        cx.lineStyle(4, 0x444444)
        cx.strokeRoundedRect(-width / 2, -height / 2, width, height, 2)
        let armRest = 14
        cx.strokeRoundedRect(-width / 2 + armRest, -height / 2 + armRest, width - armRest, height - armRest * 2, 2)
    },
    renderLayer: FURNITURE,
}

export let table = {
    physics: { shape: 'circle' },
    size: 90,
    render(cx) {
        cx.fillStyle(0x6e3300)
        cx.lineStyle(4, 0x444444)
        cx.fillCircle(0, 0, 45)
        cx.strokeCircle(0, 0, 45)
    },
    renderLayer: FURNITURE,
}

export let knife = {
    item: 'Hunting Knife',
    use({ target }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        getSynth().playNote({ duration: 0.2, frequency: 261.63 })
        target.incomingDamage += target.hasEffect('bound') || target.hasEffect('unconscious') ? 1 : 0.25
    },
    render(cx) {
        cx.fillStyle(0xeeeeee)
        cx.lineStyle(3, 0x444444)
        cx.fillTriangle(0, -4, 0, 4, 12, 0)
        cx.strokeTriangle(0, -4, 0, 4, 12, 0)

        cx.fillStyle(0x111111)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 8, 8)
        cx.strokeRoundedRect(-8, -4, 8, 8, 2)
    },
    renderLayer: ITEM,
}

export let syringe = {
    item: 'Syringe',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (1 + 5/12) })
        target.incomingDamage += 0.005
        self.define('syringeBlood')
    },
    render(cx) {
        cx.fillStyle(0xdddddd, 0.3)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRoundedRect(-8, -4, 14, 8, 2)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
    renderLayer: ITEM,
}

export let syringeM99 = {
    item: 'Syringe of M99',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (1 + 4/12) })
        target.addEffect('unconscious', 5 * 60)
        self.define('syringe')
    },
    render(cx) {
        cx.fillStyle(0x990099, 0.7)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRoundedRect(-8, -4, 14, 8, 2)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
    renderLayer: ITEM,
}

export let syringeBlood = {
    item: 'Syringe of Blood',
    use({ self, player }) {
        let slide = player.inventory.find(x => x?.kind === 'slide')
        if (slide) {
            slide.define('slideBlood')
            self.define('syringe')
            getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (1 + 7/12) })
        }
    },
    render(cx) {
        cx.fillStyle(0xcc0000, 0.7)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRoundedRect(-8, -4, 14, 8, 2)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
    renderLayer: ITEM,
}

export let smellingSalt = {
    item: 'Smelling Salt',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.hasEffect('unconscious'))) return
        getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (1 + 4/12) })
        target.addEffect('unconscious', 0)
    },
    render(cx) {
        cx.fillStyle(0xffffff)
        cx.lineStyle(1, 0x444444)
        for (let i = -1.5; i <= 1.5; i++) {
            for (let j = -1.5; j <= 1.5; j++) {
                let x = i * 6
                let y = j * 6
                cx.fillCircle(x, y, 2)
                cx.strokeCircle(x, y, 2)
            }
        }
    },
    renderLayer: ITEM,
}

export let plasticWrap = {
    item: 'Plastic Wrap',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.hasEffect('unconscious'))) return
        target.addEffect('bound')
        self.destroy()
        getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (1 + 2/12) })
    },
    render(cx) {
        cx.fillStyle(0x6b5531)
        cx.fillRect(-2, -16, 4, 32)
        cx.fillStyle(0xdddddd, 0.5)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-6, -16, 12, 32)
        cx.strokeRoundedRect(-6, -16, 12, 32, 2)
    },
    renderLayer: ITEM,
}

export let plasticBag = {
    item: 'Plastic Bag',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health === 0)) return
        target.destroy()
        self.define('bodyBag')
        getSynth().playNote({ duration: 0.2, frequency: 261.63 ** (11/12) })
    },
    render(cx) {
        cx.fillStyle(0x222222, 0.9)
        cx.lineStyle(3, 0x444444)
        cx.fillCircle(6, 0, 16)
        cx.strokeCircle(6, 0, 16)
    },
    renderLayer: ITEM,
}

export let bodyBag = {
    item: 'Filled Body Bag',
    render(cx) {
        cx.fillStyle(0xcc0000)
        cx.fillCircle(3, 0, 10)
        cx.fillStyle(0x222222, 0.9)
        cx.lineStyle(3, 0x444444)
        cx.fillCircle(6, 0, 16)
        cx.strokeCircle(6, 0, 16)
    },
    renderLayer: ITEM,
}

export let slide = {
    item: 'Empty Blood Slide',
    render(cx) {
        cx.fillStyle(0xcccccc, 0.2)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-4, -8, 8, 16)
        cx.strokeRect(-4, -8, 8, 16)
    },
    renderLayer: ITEM,
}

export let slideBlood = {
    item: 'Filled Blood Slide',
    render(cx) {
        cx.fillStyle(0xcccccc, 0.2)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-4, -8, 8, 16)
        cx.strokeRoundedRect(-4, -8, 8, 16, 2)
        cx.fillStyle(0xcc0000, 0.7)
        cx.fillCircle(0, 0, 3)
    },
    renderLayer: ITEM,
}
