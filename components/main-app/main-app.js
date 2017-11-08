Polymer({
  is: 'main-app',

  observers: [
    'loadPage(route)'
  ],

  ready: function () {
    page.base('')
    page('*', (ctx, next) => {
      setTimeout(() => {
        this.handleLoad()
      }, 100)

      this.hideHeader = false
      this.hideFooter = false
      this.adminPage = false

      next()
    })
    page('/register-closed', () => {
      this.route = 'register-closed'
    })
    page('/register', () => {
      this.route = 'register-form'
    })
    page('/mentorexpo', () => {
      this.route = 'mentorexpo-form'
    })
    page('/volunteer', () => {
      this.route = 'volunteer-form'
    })
    page('/sponsors', () => {
      this.route = 'sponsor-page'
    })
    page('/dayof', () => {
      this.route = 'dayof-page'
    })
    page('/rsvp/:id', (ctx) => {
      this.route = 'rsvp-page'
      this.params = ctx.params
    })

    page('/admin/*', (_, next) => {
      this.hideHeader = true
      this.hideFooter = true
      this.adminPage = true
      next()
    })
    page('/admin/select/:form/:sid', (ctx) => {
      this.route = 'select-hackers'
      this.params = ctx.params
    })
    page('/admin/select', () => {
      this.route = 'select-hackers'
    })
    page('/admin/checkin', () => {
      this.route = 'checkin-page'
    })
    page('/admin/stats', () => {
      this.route = 'stats-page'
    })
    page('/', () => {
      this.route = 'index-page'
    })

    // 404
    page('*', this.handle404.bind(this))
    page()

    window.addEventListener("hashchange", this.handleLoad.bind(this))
  },

  loadPage: function (route) {
    const pageURL = 'components/' + route + '/' + route + '.html'
    this.importHref(pageURL, this.handleLoad, this.handle404, true)
  },

  handleLoad: function () {
    // Using setTimeout so the page will load before attempting to navigate to
    // anchor.
    setTimeout(() => {
      this.updateTitle()
      this.navigateAnchor()
    }, 1);
  },

  searchElems: function () {
    const elems = Array.prototype.filter.call(this.$.pages.children, (a) => a.tagName !== 'DOM-IF')
    elems.push(this)
    return elems.filter((a) => a.$$)
  },

  navigateAnchor: function() {
    const target = window.location.hash.slice(1)
    if (!target) {
      return
    }

    for (const elem of this.searchElems()) {
      const matching = elem.$$('#' + target)
      if (!matching) {
        continue
      }
      matching.scrollIntoView(true)
      break
    }
  },

  updateTitle: function () {
    const title = 'nwHacks 2018'
    const elems = this.searchElems()
    for (const elem of elems) {
      const matching = elem.$$('h1[title]')
      if (!matching) {
        continue
      }
      document.title = matching.innerText + ' - ' + title
      return
    }

    document.title = title
  },

  handle404: function () {
    console.log('404!', this.route)
    page.redirect('/')
  }
});
