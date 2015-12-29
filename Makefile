build:
	vulcanize --abspath . --out-html build.html --strip-comments --inline-scripts --inline-css app.html

deps:
	bower install

watch:
	sass --watch css/main.scss:css/main.css&
	util/watch.sh

clean:
	rm -f build.html

.PHONY: build deps watch clean
