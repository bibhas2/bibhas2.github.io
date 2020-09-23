import Interactive from "https://vectorjs.org/interactive.js";

class Transformer {
    xscale = 1.0
    yscale = 1.0
    xmin = 0
    xmax = 0
    ymin = 0
    ymax = 0

    constructor(svg) {
        this.svg = svg
    }

    setup(data) {
        let [xmin, ymin] = data.reduce((last, pair) => [Math.min(last[0], pair[0]), Math.min(last[1], pair[1])])
        let [xmax, ymax] = data.reduce((last, pair) => [Math.max(last[0], pair[0]), Math.max(last[1], pair[1])])

        this.xmin = xmin
        this.xmax = xmax
        this.ymin = ymin
        this.ymax = ymax

        let [xsum, ysum] = data.reduce((last, pair) => [last[0] + pair[0], last[1] + pair[1]])

        let xavg = xsum / data.length
        let yavg = ysum / data.length

        this.xscale = (2 * xavg) / (this.svg.width - this.svg.originX)
        this.yscale = (2 * yavg) / this.svg.originY

        let transformedData = data.map(pair => [pair[0] / this.xscale, - (pair[1] / this.yscale)])

        return transformedData
    }

    toSVG(pair) {
        return [pair[0] / this.xscale, - (pair[1] / this.yscale)]
    }
    fromSVG(pair) {
        return [pair[0] * this.xscale, - (pair[1] * this.yscale)]
    }
    getSlope(start, end) {
        let startData = this.fromSVG([start.x, start.y])
        let endData = this.fromSVG([end.x, end.y])

        return (endData[1] - startData[1]) / (endData[0] - startData[0])
    }
}

Vue.component('gd-tool', {
    template: `
    <div class="data-table">
    <div class="table-description">
      Correlation of Foot Traffic (Customers/hour) with Temperature.
    </div>
    <div class="table-header">Temperature<br />(x)</div>
    <div class="table-header">Actual<br />Foot Traffic<br />(y)</div>
    <div class="table-header">Predicted<br />Foot Traffic<br />(y')</div>
    <div class="table-header">Error<br/>(y - y')</div>
    <template v-for="sample in sourceData">
      <div class="data-cell">{{fmt(sample[0])}}</div>
      <div class="data-cell">{{fmt(sample[1])}}</div>
      <div class="data-cell">{{fmt(predict(sample[0]))}}</div>
      <div class="data-cell">{{fmt(error(sample[0], sample[1]))}}</div>
    </template>
    <div class="rmse-label">
      Root Mean Square Error (RMSE)
    </div>
    <div class="rmse-value">{{rmseFormatted}}</div>
    </div>
    `,
    props: {
        mode: {
            default: "normal"
        }
    },
    data() {
        return {
            sourceData: [
                [30, 6.5],
                [40, 9],
                [45, 9],
                [50, 9.6],
                [60, 10],
                [65, 11.5],
                [70, 12.],
                [75, 12.5],
                [80, 14.75]
            ],
            margin: 40,
            interactive: undefined,
            xform: undefined,
            transformedData: undefined,
            numFormatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }),
            lrFormatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 5 }),
            W: 0,
            b: 0,
            rmse: 0,
            line: undefined,
            start: undefined,
            bValue: undefined,
            wValue: undefined,
            end: undefined,
            slider: undefined,
        }
    },
    methods: {
        predict(temp) {
            return this.W * temp + this.b
        },
        error(temp, actual) {
            return this.predict(temp) - actual
        },
        fmt(n) {
            return this.numFormatter.format(n)
        },
        updateRMSE() {
            const sumErrorSquared = this.sourceData.reduce((sum, pair) => {
                const err = this.error(pair[0], pair[1])

                return sum + (err * err)
            }, 0.0)

            this.rmse = sumErrorSquared / (2 * this.sourceData.length)
        },
        trainingStep() {
            for (let i = 0; i < 5000; ++i) {
                let [dJ_dW, dJ_db] = this.sourceData
                    .map(pair => {
                        const base = (this.predict(pair[0]) - pair[1])

                        return [base * pair[0], base]
                    })
                    .reduce((acc, current) => [acc[0] + current[0], acc[1] + current[1]], [0, 0])

                dJ_dW = dJ_dW / this.sourceData.length
                dJ_db = dJ_db / this.sourceData.length

                this.W = this.W - this.slider.value * dJ_dW
                this.b = this.b - this.slider.value * dJ_db

                // let coord = this.xform.toSVG([0, this.b])
                // this.start.y = coord[1]
                // this.start.y = -100
            }
            this.updateRMSE()

            let coord = this.xform.toSVG([0, this.b])
            this.start.y = coord[1]

            let startVal = this.xform.fromSVG([this.start.x, this.start.y])
            let endVal = this.xform.fromSVG([this.end.x, this.end.y])
            //Update end value y
            endVal[1] = startVal[1] + this.W * (endVal[0] - startVal[0])
            coord = this.xform.toSVG(endVal)

            this.end.y = coord[1]

            this.bValue.update()
            this.wValue.update()
            this.line.update()
        }
    },
    mounted() {
        this.interactive = new Interactive("my-interactive", {
            width: 600,
            height: 400,
            originX: this.margin,
            originY: 400 - this.margin
        })
        this.xform = new Transformer(this.interactive)
        this.transformedData = this.xform.setup(this.sourceData)

        let coord = this.xform.toSVG([0, this.xform.ymin])
        this.start = this.interactive.control(coord[0], coord[1])

        coord = this.xform.toSVG([0, this.xform.ymax])
        this.end = this.interactive.control(this.interactive.width - 2 * this.margin, coord[1])
        this.line = this.interactive.line(this.start.x, this.start.y, this.end.x, this.end.y)

        let xAxis = this.interactive.line(0, 0, this.interactive.width - this.margin, 0);
        let yAxis = this.interactive.line(0, 0, 0, -this.interactive.height + this.margin);
        let marker = this.interactive.marker(10, 5, 10, 10);
        marker.path('M 0 0 L 10 5 L 0 10 z').style.fill = '#404040';
        marker.setAttribute('orient', 'auto-start-reverse');
        xAxis.setAttribute('marker-end', `url(#${marker.id})`);
        yAxis.setAttribute('marker-end', `url(#${marker.id})`);

        this.start.constrainToY()
        this.end.constrainToY()

        /*
            this.end.addDependency(this.start)
            this.end.update = () => {
                this.end.y = this.end.y + this.start.dy
            }    
        */

        this.line.addDependency(this.start)
        this.line.addDependency(this.end)
        this.line.update = () => {
            this.line.x1 = this.start.x;
            this.line.y1 = this.start.y;
            this.line.x2 = this.end.x;
            this.line.y2 = this.end.y;
        }

        coord = this.xform.fromSVG([0, this.start.y])
        this.b = coord[1]
        this.bValue = this.interactive.text(this.start.x + 10, this.start.y + 10, `b: ${this.fmt(this.b)}`)
        this.bValue.addDependency(this.start)
        this.bValue.update = () => {
            this.bValue.y += this.start.dy

            let pair = this.xform.fromSVG([0, this.start.y])
            this.b = pair[1]
            this.bValue.contents = `b: ${this.fmt(this.b)}`

            this.updateRMSE()
        }

        this.W = this.xform.getSlope(this.start, this.end)
        this.wValue = this.interactive.text(this.end.x - 80, this.end.y - 10, `W: ${this.fmt(this.W)}`)
        this.wValue.addDependency(this.end)
        this.wValue.update = () => {
            this.wValue.y += this.end.dy
            this.W = this.xform.getSlope(this.start, this.end)
            this.wValue.contents = `W: ${this.fmt(this.W)}`

            this.updateRMSE()
        }

        this.transformedData.forEach(pair => {
            this.interactive.circle(pair[0], pair[1], 5)
        })

        let xLabel = this.interactive.text(75, -10, "Foot Traffic. (Customers/hr)")
        xLabel.setAttribute('transform', `rotate(${-90})`)
        let yLabel = this.interactive.text(200, 20, "Temperature (F)")

        if (this.mode === "training") {
            this.slider = this.interactive.slider(this.interactive.width - 200, -70, {
                min: 0.00001, max: 0.0005, value: 0.0005,
            })
            let lr = this.interactive.text(this.interactive.width - 190, -90, `LR: ${this.lrFormatter.format(this.slider.value)}`)
            lr.addDependency(this.slider)
            lr.update = () => {
                lr.contents = `LR: ${this.lrFormatter.format(this.slider.value)}`
            }

            let button = this.interactive.button(this.interactive.width - 200, -30, "Train Step")

            button.onclick = () => {
                this.trainingStep()
            }
        }
        this.updateRMSE()
    },
    computed: {
        rmseFormatted() {
            return this.fmt(this.rmse)
        }
    },
})
