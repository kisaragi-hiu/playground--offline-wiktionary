variant ?= "jawiktionary"
wget := wget --show-progress -q

target:
	echo $(variant)

$(variant)-latest-md5sums.txt:
	echo Fetching data for $(variant)...
	$(wget) "https://dumps.wikimedia.org/$(variant)/latest/$(variant)-latest-md5sums.txt"

$(variant)-latest-pages-articles.xml.bz2:
	$(wget) "https://dumps.wikimedia.org/$(variant)/latest/$(variant)-latest-pages-articles.xml.bz2"

$(variant)-latest-pages-articles.xml: $(variant)-latest-pages-articles.xml.bz2
	bzip2 -d "$<" -k

.PHONY: xml
xml: $(variant)-latest-pages-articles.xml

articles.sqlite: xml convert.ts
	bun convert.ts
