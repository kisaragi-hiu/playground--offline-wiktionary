variant ?= zh_min_nanwiktionary
DATE := 20240401
wget := wget --show-progress -q
htmldumpDir := /run/media/kisaragi-hiu/Data/

src_deps := sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so convert.ts
data_deps := $(variant)-latest-pages-articles.xml $(htmldumpDir)$(variant)-htmldump.ndjson

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

%.tar.gz:
	$(wget) -c "https://dumps.wikimedia.org/other/enterprise_html/runs/$(DATE)/$@"

$(htmldumpDir)$(variant)-htmldump.ndjson: $(variant)-NS0-$(DATE)-ENTERPRISE-HTML.json.tar.gz $(variant)-NS14-$(DATE)-ENTERPRISE-HTML.json.tar.gz
	tar -zxf "$(variant)-NS0-$(DATE)-ENTERPRISE-HTML.json.tar.gz" -O >> $(htmldumpDir)$(variant)-htmldump.ndjson
	tar -xzf "$(variant)-NS14-$(DATE)-ENTERPRISE-HTML.json.tar.gz" -O >> $(htmldumpDir)$(variant)-htmldump.ndjson

.PHONY: data
data: $(data_deps)

$(variant)-articles.sqlite: $(data_deps) $(src_deps)
	bunx tsx convert.ts $(variant) $(htmldumpDir)

.PHONY: sqlite
sqlite: $(variant)-articles.sqlite
