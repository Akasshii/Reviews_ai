package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"reviews-ai/internal/application/usecase"
	"reviews-ai/internal/domain/entity"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	userUseCase *usecase.UserUseCase
}

func NewUserHandler(userUseCase *usecase.UserUseCase) *UserHandler {
	return &UserHandler{
		userUseCase: userUseCase,
	}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	user, err := h.userUseCase.GetProfile(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var dto entity.UpdateUserDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userUseCase.UpdateProfile(c.Request.Context(), userID.(uuid.UUID), &dto)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "не авторизован"})
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "файл не найден в запросе"})
		return
	}
	defer file.Close()

	const maxSize = 5 << 20 // 5 MB
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "файл превышает 5 МБ"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	allowedTypes := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
		"image/gif":  ".gif",
	}
	ext, ok := allowedTypes[contentType]
	if !ok {
		ext = strings.ToLower(filepath.Ext(header.Filename))
		allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
		if !allowed[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "допустимы только изображения (jpg, png, webp, gif)"})
			return
		}
	}

	uploadDir := "./uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ошибка создания директории"})
		return
	}

	uid := userID.(uuid.UUID)
	filename := fmt.Sprintf("%s%s", uid.String(), ext)
	savePath := filepath.Join(uploadDir, filename)

	out, err := os.Create(savePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ошибка сохранения файла"})
		return
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	for {
		n, readErr := file.Read(buf)
		if n > 0 {
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ошибка записи файла"})
				return
			}
		}
		if readErr != nil {
			break
		}
	}

	avatarPath := "/uploads/avatars/" + filename
	dto := &entity.UpdateUserDTO{Avatar: &avatarPath}
	user, err := h.userUseCase.UpdateProfile(c.Request.Context(), uid, dto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ошибка обновления профиля"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "не авторизован"})
		return
	}

	var dto entity.ChangePasswordDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "заполните все поля (текущий пароль и новый пароль мин. 6 символов)"})
		return
	}

	if err := h.userUseCase.ChangePassword(c.Request.Context(), userID.(uuid.UUID), &dto); err != nil {
		if err.Error() == "неверный текущий пароль" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ошибка смены пароля"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "пароль успешно изменён"})
}
