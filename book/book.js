Vue.component("book", {
    template: `
<div>
    <img :src="currentFile" class="page" @click="navigateOnClick($event)"/>
    <link rel="prefetch" :href="prefetchFile">
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

            this.onChangePage()
        }

        window.addEventListener('keyup', this.navigateOnKey)
    },
    beforeDestroy() {
        window.removeEventListener('keyup', this.navigateOnKey);
    },
    methods: {
        next() {
            if (this.currentPage < this.lastPage) {
                this.currentPage += 1
            }

            this.onChangePage()
        },
        prev() {
            if (this.currentPage > this.firstPage) {
                this.currentPage -= 1
            }

            this.onChangePage()
        },
        navigateOnClick(e) {
            let rect = e.target.getBoundingClientRect();

            if (e.clientX > rect.left + rect.width / 2.0) {
                this.next()
            } else {
                this.prev()
            }
        },
        navigateOnKey(e) {
            if (e.key === "ArrowRight") {
                this.next()
            } else if (e.key === "ArrowLeft") {
                this.prev()
            }
        },
        onChangePage() {
            // window.scrollTo(0, 0)
            this.saveLocation()
        },
        saveLocation() {
            localStorage.setItem(this.baseFileName, this.currentPage.toString())
        }
    },
    computed: {
        currentFile() {
            return `${this.baseFileName}${this.currentPage}${this.extension}`
        },
        prefetchFile() {
            let nextNo = this.currentPage + 1

            if (nextNo >= this.lastPage) {
                nextNo = this.currentPage
            }

            return `${this.baseFileName}${nextNo}${this.extension}`
        }
    }
})