Vue.component("book", {
    template: `
<div>
    <img :src="currentFile" class="page" @click="navigate($event)"/>
</div>
    `,
    props: [
        "baseFileName",
        "extension",
        "firstPage",
        "lastPage"
    ],
    data() {
        return {
            currentPage: this.firstPage
        }
    },
    mounted() {
        let savedPage = localStorage.getItem(this.baseFileName)

        if (savedPage == null) {
            console.log("Page was not saved")

            return
        }

        savedPage = parseInt(savedPage)

        if (savedPage >= this.firstPage && savedPage <= this.lastPage) {
            this.currentPage = savedPage

            console.log("Jumping to page", savedPage)
        }
    },
    methods: {
        next() {
            if (this.currentPage < this.lastPage) {
                this.currentPage += 1
            }
        },
        prev() {
            if (this.currentPage > this.firstPage) {
                this.currentPage -= 1
            }
        },
        navigate(e) {
            let rect = e.target.getBoundingClientRect();
            // console.log(e.clientX, e.clientY, rect)
            if (e.clientX > rect.left + rect.width / 2.0) {
                this.next()
            } else {
                this.prev()
            }

            this.saveLocation()
        },
        saveLocation() {
            localStorage.setItem(this.baseFileName, this.currentPage.toString())
        }
    },
    computed: {
        currentFile() {
            return `${this.baseFileName}${this.currentPage}.${this.extension}`
        }
    }
})