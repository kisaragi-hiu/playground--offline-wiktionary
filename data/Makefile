variant ?= jawiktionary
wget := wget --show-progress -q

target:
	echo $(variant)

sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so:
	curl -L "https://github.com/phiresky/sqlite-zstd/releases/download/v0.3.2/sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu.tar.gz" | tar -zx sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so

$(variant)-latest-md5sums.txt:
	echo Fetching data for $(variant)...
	$(wget) "https://dumps.wikimedia.org/$(variant)/latest/$(variant)-latest-md5sums.txt"

$(variant)-latest-pages-articles.xml.bz2:
	$(wget) "https://dumps.wikimedia.org/$(variant)/latest/$(variant)-latest-pages-articles.xml.bz2"

$(variant)-latest-pages-articles.xml: $(variant)-latest-pages-articles.xml.bz2
	bzip2 -d "$<" -k

.PHONY: xml
xml: $(variant)-latest-pages-articles.xml

$(variant)-articles.sqlite: $(variant)-latest-pages-articles.xml sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so convert.ts
	bun convert.ts $(variant)

.PHONY: sqlite
sqlite: $(variant)-articles.sqlite
