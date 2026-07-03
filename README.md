# Proyek UAS MACHINE LEARNING: LDA, FTC Clustering, dan Rule-Based NER

NAMA ANGGOTA : 
DANIEL ALFAREZI (2212500272)
DIMAS NUR SEPTIAN (2212500371)

README ini menjelaskan isi notebook [`code.ipynb`](code.ipynb). Proyek ini memakai dataset komentar YouTube pada file [`komentar_youtube.csv`](komentar_youtube.csv), lalu memproses kolom teks komentar untuk tiga tahap utama:

1. Topic modeling menggunakan LDA.
2. Clustering komentar menggunakan metode FTC.
3. Named Entity Recognition menggunakan rule-based NER.

## Struktur Proyek

```text
UAS-TOPIK/
|-- code.ipynb
|-- komentar_youtube.csv
|-- scraping.py
|-- outputs/
|   |-- comments_preprocessed.csv
|   |-- topic_words.csv
|   |-- topic_matrix.csv
|   |-- lda_topic_comment_counts.csv
|   |-- lda_visualisasi_bar_chart.html
|   |-- ftc_candidate_table.csv
|   |-- ftc_selected_clusters.csv
|   |-- cluster_summary.csv
|   |-- comment_topics_clusters.csv
|   |-- ner_entities_rule_based_komentar_youtube.csv
|   |-- ner_contextual_features.csv
|   |-- ner_morphological_features.csv
|   |-- ner_pos_features.csv
|   |-- ner_token_feature_assignment.csv
|   |-- ner_contextual_if_then_rules.csv
|   |-- ner_morphological_if_then_rules.csv
|   |-- ner_pos_if_then_rules.csv
|   |-- ner_if_then_rules.csv
|   +-- ftc_validation/
|       +-- ftc_validasi_entropy_overlap.xlsx
+-- output/
    +-- pdf/
```

## Dataset

Dataset utama adalah `komentar_youtube.csv`. Notebook otomatis mencari kolom teks dari beberapa kandidat nama kolom, seperti `komentar`, `text`, `comment`, dan variasi lain. Jika dataset belum memiliki `comment_id`, notebook akan membuat `comment_id` otomatis dari nomor urut baris.

Pada versi ini dataset berisi 500 komentar YouTube.

## Alur Notebook

Notebook dibagi menjadi beberapa tahap:

1. Load dataset.
2. Preprocessing teks.
3. LDA topic modeling.
4. FTC clustering.
5. Visualisasi hasil LDA.
6. Export hasil.
7. Rule-based NER.
8. Tabel hasil akhir.

## 1. Preprocessing Teks

Tahap preprocessing berada pada bagian `## 1. Preprocessing Teks`.

Langkah preprocessing:

1. Mengubah teks menjadi huruf kecil.
2. Menghapus URL.
3. Menghapus mention.
4. Membersihkan hashtag.
5. Menghapus simbol dan karakter non-huruf.
6. Normalisasi slang sederhana, misalnya:
   - `yg` menjadi `yang`
   - `dgn` menjadi `dengan`
   - `gak`, `ga`, `nggak` menjadi `tidak`
   - `org` menjadi `orang`
7. Menghapus stopword menggunakan Sastrawi.
8. Melakukan stemming menggunakan Sastrawi.
9. Menghapus token terlalu pendek dan token tawa seperti `wkwk`.

Output preprocessing disimpan ke:

```text
outputs/comments_preprocessed.csv
```

Kolom penting:

- `komentar`: teks asli.
- `normalized_text`: teks setelah normalisasi awal.
- `clean_text`: teks bersih setelah stopword removal dan stemming.
- `token_count`: jumlah token hasil preprocessing.

Contoh:

```text
normalized_text: org sepintar ini kalah saya tukang mebel
clean_text: orang pintar kalah tukang mebel
```

## 2. LDA Topic Modeling

Bagian LDA berada pada `## 2. LDA Topic Modeling`.

LDA digunakan untuk menemukan topik tersembunyi dari komentar. Notebook ini memakai implementasi sederhana LDA berbasis `numpy`, sehingga tidak bergantung pada `sklearn` atau `gensim`.

Tahapan LDA:

1. Mengambil token hasil preprocessing.
2. Membuat vocabulary.
3. Mengubah dokumen menjadi daftar ID kata.
4. Melatih model LDA.
5. Mengambil kata dominan dari setiap topik.
6. Menghitung distribusi topik untuk setiap komentar.

Output LDA:

```text
outputs/topic_words.csv
outputs/topic_matrix.csv
```

`topic_words.csv` berisi kata-kata dominan per topik.  
`topic_matrix.csv` berisi probabilitas setiap komentar terhadap masing-masing topik.

## Visualisasi LDA

Notebook juga menghasilkan visualisasi LDA:

1. Bar chart jumlah komentar per topik.
2. Bar chart top words per topic.

Output visualisasi:

```text
outputs/lda_topic_comment_counts.csv
outputs/lda_visualisasi_bar_chart.html
```

File HTML dapat dibuka langsung di browser untuk melihat grafik.

## 3. FTC Clustering

Bagian clustering berada pada `## 3. Clustering Komentar dengan FTC`.

FTC adalah singkatan dari Frequent Term Based Clustering. Metode ini membentuk kandidat cluster berdasarkan frequent term atau frequent term set, kemudian memilih cluster berdasarkan nilai Entropy Overlap (EO).

Parameter utama:

```python
FTC_MIN_SUPPORT = 8
FTC_MAX_K = 2
FTC_MAX_TERMS = 120
```

Artinya:

- Minimal support adalah 8 dokumen.
- Termset maksimal berisi 2 kata.
- Frequent term yang dipertimbangkan maksimal 120 kata.

Tahapan FTC:

1. Menghitung frequent term dari dokumen.
2. Membentuk kandidat termset.
3. Mengambil dokumen yang mengandung termset tersebut.
4. Menghitung frekuensi overlap dokumen.
5. Menghitung Entropy Overlap.
6. Memilih kandidat dengan EO minimum sebagai cluster terpilih.
7. Menghapus anggota dokumen cluster terpilih dari kandidat berikutnya.
8. Mengulang proses sampai tidak ada kandidat yang memenuhi minimal support.
9. Dokumen sisa dimasukkan ke residual cluster.

Rumus EO yang dipakai:

```text
EO = SUM((-1 / f_d) * LN(1 / f_d))
```

Keterangan:

- `f_d` adalah jumlah kandidat cluster yang memuat dokumen `d`.
- Jika suatu dokumen muncul di banyak kandidat, kontribusinya memengaruhi nilai overlap.

Output FTC:

```text
outputs/ftc_candidate_table.csv
outputs/ftc_selected_clusters.csv
outputs/cluster_summary.csv
outputs/comment_topics_clusters.csv
```

Penjelasan file:

- `ftc_candidate_table.csv`: semua kandidat cluster, termasuk frequent term set, cluster candidate, support, rumus EO, dan nilai EO.
- `ftc_selected_clusters.csv`: cluster yang dipilih pada setiap iterasi.
- `cluster_summary.csv`: ringkasan cluster akhir.
- `comment_topics_clusters.csv`: gabungan komentar, topik LDA, dan cluster FTC.

## Excel Validasi FTC

Untuk memvalidasi perhitungan FTC, dibuat file Excel:

```text
outputs/ftc_validation/ftc_validasi_entropy_overlap.xlsx
```

Isi workbook:

- `FTC Candidates`: tabel kandidat cluster seperti contoh materi FTC.
- `EO Validation`: validasi rumus EO menggunakan formula Excel.
- `Selected Clusters`: cluster yang dipilih pada setiap iterasi FTC.

Sheet `EO Validation` memakai formula Excel agar perhitungan EO bisa diaudit langsung. Nilai EO dari Python dibandingkan dengan nilai EO dari Excel, lalu dihitung selisihnya.

## 4. Export Hasil

Bagian export berada pada `## 4. Export Hasil`.

Notebook menyimpan hasil utama ke folder `outputs/`, yaitu:

```text
comments_preprocessed.csv
topic_words.csv
topic_matrix.csv
comment_topics_clusters.csv
cluster_summary.csv
ftc_selected_clusters.csv
ftc_candidate_table.csv
```

File ini dipakai sebagai bahan analisis, validasi, dan pelaporan.

## 5. Rule-Based NER

Bagian NER berada pada `## 5. Rule-Based NER`.

NER pada proyek ini tidak memakai IndoBERT, tetapi memakai rule-based approach. Artinya, entity dikenali berdasarkan kamus dan pola regex yang ditulis manual.

Label entity yang dipakai:

- `PER`: person atau tokoh.
- `ORG`: organisasi.
- `GPE`: lokasi/geopolitical entity.
- `LAW`: istilah hukum.
- `REG`: istilah agama.
- `EVT`: event.
- `MON`: uang atau nominal.
- `QTY`: kuantitas.

Contoh rule:

```python
("PER", "person_nadiem", r"\b(nadiem makarim|nadiem|nadim|nadzim)\b")
```

Artinya, jika komentar mengandung `nadiem`, `nadim`, atau `nadzim`, maka token tersebut diberi label `PER`.

Contoh rule lain:

```python
("ORG", "org_gojek", r"\b(gojek|goto|kemendikbud|ojol)\b")
```

Artinya, jika komentar mengandung `gojek`, `goto`, `kemendikbud`, atau `ojol`, maka token tersebut diberi label `ORG`.

Output entity:

```text
outputs/ner_entities_rule_based_komentar_youtube.csv
outputs/ner_entities.csv
```

## 5.1 Feature Extraction Rule-Based NER

Notebook juga menampilkan tahapan feature extraction seperti materi NER.

Ada empat tabel utama:

1. `Table 1. List of contextual features`
2. `Table 2. List of morphological features`
3. `Table 3. List of part-of-speech features`
4. `Table 4. Result of tokenization and feature assignment processes`

### Contextual Features

Contextual features adalah fitur yang melihat konteks token.

Contoh:

- `PPRE`: person prefix, misalnya `Pak`, `Bpk`, `Dr.`
- `PTIT`: person title, misalnya `Menteri`, `Presiden`
- `OPOS`: position in organization, misalnya `Ketua`, `Rektor`
- `LOPP`: preposition before location, misalnya `di`, `ke`, `dari`

Output:

```text
outputs/ner_contextual_features.csv
outputs/ner_contextual_if_then_rules.csv
```

### Morphological Features

Morphological features adalah fitur berdasarkan bentuk token.

Contoh:

- `TitleCase`: diawali huruf besar lalu huruf kecil.
- `UpperCase`: semua huruf besar.
- `LowerCase`: semua huruf kecil.
- `Digit`: semua angka.
- `DigitSlash`: angka dengan slash, misalnya `17/5`.
- `Numeric`: angka dengan koma atau titik, misalnya `16,3`.

Output:

```text
outputs/ner_morphological_features.csv
outputs/ner_morphological_if_then_rules.csv
```

### Part-of-Speech Features

Part-of-speech features adalah fitur kelas kata sederhana.

Contoh:

- `PREP`: preposition, misalnya `di`, `ke`, `dari`
- `C`: conjunction, misalnya `dan`, `atau`, `lalu`
- `NOUN`: noun, misalnya `hukum`, `korupsi`
- `NUM`: number
- `VACT`: active verb
- `OOV`: out of dictionary

Output:

```text
outputs/ner_pos_features.csv
outputs/ner_pos_if_then_rules.csv
```

### Tokenization and Feature Assignment

Tabel ini menampilkan hasil tokenisasi komentar contoh.

Kolomnya:

- `Token string`
- `Token kind`
- `Contextual features`
- `Morphological features`
- `Part-of-speech features`

Output:

```text
outputs/ner_token_feature_assignment.csv
```

### IF-THEN Rule Assignment

Notebook menampilkan aturan IF-THEN untuk menjelaskan bagaimana fitur dan entity dikenali.

Contoh:

```text
IF
Token[i].Kind='WORD' AND Token[i].OPOS AND Token[i+1].Kind='WORD'

THEN
Token[i+1].NE='ORGANIZATION'
```

Output:

```text
outputs/ner_if_then_rules.csv
```

## 6. Tabel Hasil Akhir

Bagian akhir notebook merapikan hasil menjadi tabel:

1. Tabel hasil LDA.
2. Tabel hasil FTC clustering.
3. Tabel hasil rule-based NER.

Bagian ini dipakai agar hasil akhir mudah dibaca saat presentasi atau ditanya dosen.

## Cara Menjalankan Notebook

1. Pastikan file `komentar_youtube.csv` berada satu folder dengan `code.ipynb`.
2. Buka `code.ipynb` menggunakan Jupyter Notebook, JupyterLab, VS Code, atau Google Colab.
3. Jalankan cell dari atas sampai bawah.
4. Semua hasil akan tersimpan di folder `outputs/`.

Dependensi utama:

```text
numpy
pandas
Sastrawi
```

Jika Sastrawi belum terpasang, install dengan:

```bash
pip install Sastrawi
```

Proyek ini melakukan pemodelan topik komentar YouTube menggunakan LDA, lalu melakukan clustering dokumen dengan FTC berdasarkan frequent term set dan Entropy Overlap. Setelah itu, proyek melakukan NER menggunakan rule-based method. Pada NER, sistem tidak memakai model deep learning, tetapi menggunakan fitur kontekstual, morfologis, POS sederhana, serta aturan IF-THEN dan regex untuk mengenali entity seperti tokoh, organisasi, lokasi, istilah hukum, agama, nominal uang, kuantitas, dan event.

## Catatan

Karena preprocessing sekarang memakai stemming Sastrawi, kata pada hasil LDA dan FTC adalah bentuk dasar. Contohnya, `kejahatan` dapat berubah menjadi `jahat`, dan `perlawanan` dapat berubah menjadi `lawan`. Ini normal dalam preprocessing NLP bahasa Indonesia.
"# Topik-Modelling-UAS" 
"# Topik-Modelling-UAS" 
"# Topik-Modelling-UAS" 
"# Topik-Modelling-UAS" 
