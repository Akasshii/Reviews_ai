package parser

import (
	"fmt"
	"reviews-ai/internal/domain/service"
)

type ParserRegistry struct {
	parsers []service.ReviewParser
}

func NewParserRegistry(parsers ...service.ReviewParser) *ParserRegistry {
	return &ParserRegistry{parsers: parsers}
}

func (r *ParserRegistry) GetParser(url string) (service.ReviewParser, error) {
	for _, p := range r.parsers {
		if p.ValidateURL(url) {
			return p, nil
		}
	}
	return nil, fmt.Errorf("no parser found for URL: %s", url)
}
