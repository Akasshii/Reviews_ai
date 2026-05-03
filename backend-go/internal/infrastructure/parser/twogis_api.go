package parser

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type twoGisAPIClient struct {
	httpClient *http.Client
}

var globalTwoGisAPIClient = &twoGisAPIClient{
	httpClient: &http.Client{Timeout: 10 * time.Second},
}

type twoGisSearchResponse struct {
	Result struct {
		Total int `json:"total"`
		Items []struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			ProjectID string `json:"project_id"`
			AdmDiv    []struct {
				Type string `json:"type"`
				Name string `json:"name"`
			} `json:"adm_div"`
		} `json:"items"`
	} `json:"result"`
	Meta struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"meta"`
}

// findFirmURL calls the 2GIS Catalog API and returns a direct firm URL.
// Returns ("", nil) when no match is found — never propagates a "not found" as error.
func (c *twoGisAPIClient) findFirmURL(ctx context.Context, name, address string) (string, error) {
	// Read lazily so godotenv.Load() in main() has already run by the time we reach here.
	apiKey := os.Getenv("TWOGIS_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("TWOGIS_API_KEY not set")
	}

	query := name
	if address != "" {
		query = name + " " + address
	}

	params := url.Values{
		"q":      {query},
		"key":    {apiKey},
		"fields": {"items.id,items.name,items.point,items.adm_div"},
		"type":   {"branch"},
		"locale": {"ru_RU"},
	}

	apiURL := "https://catalog.api.2gis.com/3.0/items?" + params.Encode()
	log.Printf("[2GIS API] query=%q", query)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("2GIS API status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result twoGisSearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse: %w (body: %.200s)", err, body)
	}

	for _, item := range result.Result.Items {
		if item.ID == "" {
			continue
		}

		cityCode := item.ProjectID
		if cityCode == "" {
			for _, div := range item.AdmDiv {
				if div.Type == "city" && div.Name != "" {
					cityCode = citySlug(div.Name)
					break
				}
			}
		}

		if cityCode == "" {
			log.Printf("[2GIS API] no city code for item %s (%s), skipping", item.ID, item.Name)
			continue
		}

		firmURL := fmt.Sprintf("https://2gis.ru/%s/firm/%s/", cityCode, item.ID)
		log.Printf("[2GIS API] found: %s", firmURL)
		return firmURL, nil
	}

	log.Printf("[2GIS API] no results for %q", query)
	return "", nil
}

// citySlug maps a Russian city name to the slug used in 2GIS URLs.
// Falls back to a simple transliteration for unknown cities.
func citySlug(name string) string {
	known := map[string]string{
		"Москва":             "moscow",
		"Санкт-Петербург":    "spb",
		"Новосибирск":        "novosibirsk",
		"Екатеринбург":       "ekaterinburg",
		"Казань":             "kazan",
		"Нижний Новгород":    "nizhniy-novgorod",
		"Самара":             "samara",
		"Омск":               "omsk",
		"Уфа":                "ufa",
		"Красноярск":         "krasnoyarsk",
		"Ростов-на-Дону":     "rostov-na-donu",
		"Волгоград":          "volgograd",
		"Воронеж":            "voronezh",
		"Краснодар":          "krasnodar",
		"Саратов":            "saratov",
		"Тюмень":             "tyumen",
		"Тольятти":           "tolyatti",
		"Ижевск":             "izhevsk",
		"Барнаул":            "barnaul",
		"Ульяновск":          "ulyanovsk",
		"Пермь":              "perm",
		"Оренбург":           "orenburg",
		"Кемерово":           "kemerovo",
		"Набережные Челны":   "naberezhnyye-chelny",
		"Новокузнецк":        "novokuznetsk",
		"Рязань":             "ryazan",
		"Томск":              "tomsk",
		"Астрахань":          "astrahan",
		"Пенза":              "penza",
		"Липецк":             "lipetsk",
		"Тула":               "tula",
		"Владивосток":        "vladivostok",
		"Хабаровск":          "khabarovsk",
		"Ярославль":          "yaroslavl",
		"Махачкала":          "makhachkala",
		"Ставрополь":         "stavropol",
		"Иркутск":            "irkutsk",
		"Калининград":        "kaliningrad",
		"Брянск":             "bryansk",
		"Иваново":            "ivanovo",
		"Белгород":           "belgorod",
		"Сочи":               "sochi",
		"Тверь":              "tver",
		"Сургут":             "surgut",
		"Курск":              "kursk",
		"Магнитогорск":       "magnitogorsk",
		"Челябинск":          "chelyabinsk",
		"Чебоксары":          "cheboksary",
		"Владимир":           "vladimir",
		"Смоленск":           "smolensk",
		"Архангельск":        "arkhangelsk",
		"Мурманск":           "murmansk",
		"Калуга":             "kaluga",
		"Симферополь":        "simferopol",
		"Севастополь":        "sevastopol",
		"Нижний Тагил":       "nzhny-tagil",
		"Улан-Удэ":           "ulan-ude",
		"Якутск":             "yakutsk",
		"Чита":               "chita",
		"Петрозаводск":       "petrozavodsk",
		"Нальчик":            "nalchik",
		"Владикавказ":        "vladikavkaz",
		"Майкоп":             "maykop",
		"Черкесск":           "cherkessk",
		"Горно-Алтайск":      "gorno-altaysk",
		"Элиста":             "elista",
		"Грозный":            "grozny",
		"Саранск":            "saransk",
		"Йошкар-Ола":         "yoshkar-ola",
		"Сыктывкар":          "syktyvkar",
		"Нарьян-Мар":         "naryan-mar",
		"Абакан":             "abakan",
		"Кызыл":              "kyzyl",
		"Биробиджан":         "birobidzhan",
		"Благовещенск":       "blagoveshchensk",
		"Южно-Сахалинск":     "yuzhno-sakhalinsk",
		"Магадан":            "magadan",
		"Петропавловск-Камчатский": "petropavlovsk-kamchatskiy",
		"Анадырь":            "anadyr",
		"Салехард":           "salekhard",
		"Ханты-Мансийск":     "khanty-mansiysk",
	}

	if slug, ok := known[name]; ok {
		return slug
	}

	// Generic transliteration fallback (covers most Cyrillic cities)
	return cyrillicToSlug(name)
}

func cyrillicToSlug(s string) string {
	table := map[rune]string{
		'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d",
		'е': "e", 'ё': "yo", 'ж': "zh", 'з': "z", 'и': "i",
		'й': "y", 'к': "k", 'л': "l", 'м': "m", 'н': "n",
		'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t",
		'у': "u", 'ф': "f", 'х': "kh", 'ц': "ts", 'ч': "ch",
		'ш': "sh", 'щ': "shch", 'ъ': "", 'ы': "y", 'ь': "",
		'э': "e", 'ю': "yu", 'я': "ya",
	}
	var b strings.Builder
	prev := ' '
	for _, r := range strings.ToLower(s) {
		if r == ' ' || r == '-' {
			if prev != '-' {
				b.WriteByte('-')
			}
			prev = '-'
			continue
		}
		if t, ok := table[r]; ok {
			b.WriteString(t)
		} else if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
		prev = r
	}
	return strings.Trim(b.String(), "-")
}
