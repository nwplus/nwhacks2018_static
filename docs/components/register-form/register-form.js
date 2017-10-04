Polymer({
  is: "register-form",

  properties: {
    valid: {
      type: Boolean,
      value: function() { return true; }
    },

    githubURL: {
      computed: 'updateGithubURL(data.github)'
    },

    citiesURL: {
      computed: 'updateCitiesURL(data.city, cityFocused)'
    },

    citiesClean: {
      computed: 'cleanCities(cities)'
    },

    data: {
      type: Object,
      notify: true,
      value: function() {
        return {
          travel_reimbursement: false,
          first_hackathon: false,
          mentor: false
        };
      }
    },

    alreadyRegistered: {
      value: false
    }
  },

  observers: [
    'checkEmail(data.email)',
  ],

  checkEmail: function(email) {
    console.log('email',email);
    if (this.checkEmailTimeout) {
      clearTimeout(this.checkEmailTimeout);
      this.checkEmailTimeout = false;
    }
    if (!email) {
      return;
    }
    var self = this;
    this.checkEmailTimeout = setTimeout(function() {
      self.checkEmailTimeout = false;

      firebase.database().ref('emails').child(btoa(self.data.email)).once('value').then(function(snapshot) {
        var val = snapshot.val();
        self.alreadyRegistered = !!val;
      });
    }, 200);
  },

  attached: function() {
    var self = this;
    setTimeout(function() {
      self.$.form.validate();
    }, 1);
  },

  updateGithubURL: function(github) {
    if (!github) {
      return "";
    }
    return "https://api.github.com/users/"+github;
  },

  updateCitiesURL: function(city, focused) {
    if (!city || !focused) {
      return "";
    }
    return "https://api.teleport.org/api/cities/?limit=5&search="+city;
  },

  cleanCities: function(cities) {
    return cities && cities._embedded['city:search-results'];
  },

  selectCity: function(e) {
    this.set('data.city', e.model.item.matching_full_name);
  },

	cleanFileName: function(name) {
		return name.replace(/[^A-Za-z0-9\.\-\(\)]+/g, '-');
	},

  submit: function() {
    var self = this;
    this.valid = this.$.form.validate();
    if (this.valid) {
      this.$.submitting.open();
      const userKey = firebase.database().ref('ids').push().key;

      const files = this.$.resume.inputElement.files;
      var filePromise = Promise.resolve();
      if (files.length > 0) {
        const file = files[0];
        const fileName = this.cleanFileName(file.name);
        const filePath = "resumes/"+userKey+"-"+fileName;
        this.data.resume = filePath;
        filePromise = firebase.storage().ref(filePath).put(file);
      }

      filePromise.then(function() {
        return firebase.database().ref('registrations').child(userKey).set(self.data);
      }).then(function() {
        return firebase.database().ref('emails').child(btoa(self.data.email)).set(true);
      }).then(function(e) {
        console.log('Registered', e);
        self.$.submitting.close();
        self.$.registered.open();
      }).catch(function(err) {
        console.log('Error!', err);
        self.error = err;
        self.$.submitting.close();
        self.$.error.open();
      });
    }
  }
});
// Initialize Firebase
var config = {
  apiKey: "AIzaSyBou6z9QA7zvCpxUFLoTbwQZcWuBn47yEA",
  authDomain: "nwhacks-96701.firebaseapp.com",
  databaseURL: "https://nwhacks-96701.firebaseio.com",
  storageBucket: "nwhacks-96701.appspot.com",
  messagingSenderId: "874137730051"
};
firebase.initializeApp(config);
