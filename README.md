# Конвертер классификатора ОКТМО в иерархическую структуру субъектов, районов и населенных пунктов России

Конвертирует JSON-файлы, скачанные отсюда https://mydata.biz/ru/catalog/databases/oktmo


# Структура выходного файла

## JSON (по умолчанию)

На выходе получаем дерево:

* Субъект РФ
  * Муниципальное образование
    * Населенный пункт 

Пример
```json
[
  {
      "name": "Республика Татарстан",
      "regions": [
        {
          "name": "Зеленодольский муниципальный район",
          "localities": [
            {
              "name": "г Зеленодольск",
              "fullName": "Республика Татарстан, Зеленодольский муниципальный район, г Зеленодольск"
            },
           {
              "name": "д Никольское",
              "fullName": "Республика Татарстан, Зеленодольский муниципальный район, д Никольское"
            },
            ...
          ]
        },
        ...
      ]
  },
  ...
]
```

## MongoDB

Утилита также может сформировать файлы для импорта в MongoDB:
* mongo_subjects.json - субъекты РФ
* mongo_regions.json - районы
* mongo_localities.json - населенные пункты

### Модель данных:

#### Subject:
```
{
    name: String,
    oktmo: String
}
```

#### Region:
```
{
    name: String,
    oktmo: String,
    federalSubject: ObjectId
}
```

#### Locality:
```
{
    name: String,
    oktmo: String,
    federalSubject: ObjectId,
    region: ObjectId
}
```

# Как использовать

Сначала необходимо скачать  и распаковыть исходный файл:
```bash
mkdir ./oktmo
cd oktmo
wget https://mydata.biz/storage/download/6741904ba0cb4483816407846291f8d1/%D0%9E%D0%9A%D0%A2%D0%9C%D0%9E_json.zip -O ./source.zip
unzip ./source.zip
cd ..
```

Далее, в зависимости от потребности, можно:

Создать JSON-файл
```bash
oktmo-convert -o <dest.json> ./oktmo 
```

Импортировать в MongoDB
```bash
oktmo-convert -f mongo ./oktmo
mongoimport --file mongo_subjects.json -c regions -d oktmo-test --drop 
mongoimport --file mongo_regions.json -c regions -d oktmo-test --drop 
mongoimport --file mongo_localities.json -c localities -d oktmo-test --drop
```
