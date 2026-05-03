package handler

import (
	"context"
	"net/http"
	"reviews-ai/internal/application/usecase"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/infrastructure/parser"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LocationHandler struct {
	locationUseCase *usecase.LocationUseCase
	twoGisParser    *parser.TwoGisParser
}

func NewLocationHandler(locationUseCase *usecase.LocationUseCase, twoGisParser *parser.TwoGisParser) *LocationHandler {
	return &LocationHandler{
		locationUseCase: locationUseCase,
		twoGisParser:    twoGisParser,
	}
}

func (h *LocationHandler) FindTwoGisURL(c *gin.Context) {
	name := c.Query("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	address := c.Query("address")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 35*time.Second)
	defer cancel()

	firmURL, err := h.twoGisParser.FindOrgURL(ctx, name, address)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"url": ""})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": firmURL})
}

func (h *LocationHandler) CreateLocation(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var dto entity.CreateLocationDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "укажите название филиала"})
		return
	}

	location, err := h.locationUseCase.CreateLocation(c.Request.Context(), userID.(uuid.UUID), &dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, location)
}

func (h *LocationHandler) GetLocations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	locations, err := h.locationUseCase.GetLocations(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, locations)
}

func (h *LocationHandler) GetLocationByID(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "невалидный ID"})
		return
	}

	location, err := h.locationUseCase.GetLocationByID(c.Request.Context(), locationID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, location)
}

func (h *LocationHandler) UpdateLocation(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "невалидный ID"})
		return
	}

	var dto entity.UpdateLocationDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	location, err := h.locationUseCase.UpdateLocation(c.Request.Context(), locationID, userID.(uuid.UUID), &dto)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, location)
}

func (h *LocationHandler) DeleteLocation(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "невалидный ID"})
		return
	}

	if err := h.locationUseCase.DeleteLocation(c.Request.Context(), locationID, userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "филиал удалён"})
}
