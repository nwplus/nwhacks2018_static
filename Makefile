build:
	vulcanize --abspath . --strip-comments --inline-scripts --inline-css app.html | crisper --html build.html --js build.js

deps:
	bower install

watch:
	sass --watch css/main.scss:css/main.css&
	util/watch.sh

.PHONY: clean
clean:
	rm -f build.html build.js
