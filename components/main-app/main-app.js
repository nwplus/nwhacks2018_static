// Gesture events like tap and track generated from touch will not be
// preventable, allowing for better scrolling performance.
Polymer.setPassiveTouchGestures(true)

class MainApp extends Polymer.Element {
  static get is () { return 'main-app' }

  static get observers () {
    return [
      'loadPage(route)'
    ]
  }

  connectedCallback () {
    super.connectedCallback()

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
    page('/admin/settings', () => {
      this.route = 'admin-settings'
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
  }

  loadPage (route) {
    const pageURL = 'components/' + route + '/' + route + '.html'
    Polymer.importHref(pageURL, this.handleLoad.bind(this), this.handle404, true)
  }

  handleLoad () {
    // Using setTimeout so the page will load before attempting to navigate to
    // anchor.
    setTimeout(() => {
      this.updateTitle()
      this.navigateAnchor()
    }, 1)
  }

  searchElems () {
    const elems = Array.prototype.filter.call(this.$.pages.children, (a) => a.tagName !== 'DOM-IF')
    elems.push(this)
    return elems.filter((a) => a.$$)
  }

  navigateAnchor () {
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
  }

  updateTitle () {
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
  }

  handle404 () {
    console.log('404!', this.route)
    page.redirect('/')
  }
}

customElements.define(MainApp.is, MainApp)
