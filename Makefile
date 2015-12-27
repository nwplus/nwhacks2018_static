build:
	vulcanize --abspath . --out-html build.html --strip-comments --inline-scripts --inline-css app.html

deps:
	bower install

watch:
	sass --watch css/main.scss:css/main.css&
	util/watch.sh

.PHONY: clean
clean:
	rm -f build.html
