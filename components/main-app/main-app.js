Polymer({
  is: 'main-app',

  observers: [
    'loadPage(route)'
  ],

  ready: function () {
    if (window.location.hash.startsWith('#%21')) {
      window.location.hash = '#!' + window.location.hash.substr(4)
    }

    const self = this

    page.base('/')
    page('*', function (ctx, next) {
      setTimeout(function() {
        self.handleLoad()
      }, 100)

      self.hideFooter = false
      self.adminPage = false

      next()
    })
    page('/register-closed', function () { self.route = 'register-closed' })
    page('/register-wip', function () { self.route = 'register-form' })
    page('/register', function () { self.route = 'register-closed' })
    page('/sponsors', function () { self.route = 'sponsor-page' })
    page('/dayof', function () {
      self.route = 'dayof-page'
    })
    page('/rsvp/:id', function (e) {
      self.route = 'rsvp-page'
      self.params = e.params
    })

    page('/admin/*', function (_, next) {
      self.hideFooter = true
      self.adminPage = true
      next()
    })
    page('/admin/select', function () {
      self.route = 'select-hackers'
    })
    page('/admin/checkin', function () {
      self.route = 'checkin-page'
    })
    page('/admin/stats', function () {
      self.route = 'stats-page'
    })

    page('/*', function () { self.route = 'index-page' })
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
      matching.scrollIntoView()
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
