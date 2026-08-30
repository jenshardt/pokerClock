package com.pokerclock.config;

import com.pokerclock.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.Optional;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final String AUTH_HEADER = "X-Auth-Token";
    public static final String CURRENT_USER_ATTRIBUTE = "pokerclock.currentUser";

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader(AUTH_HEADER);
        Optional<AuthService.SessionUser> session = authService.resolveSession(token);
        if (session.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return false;
        }

        request.setAttribute(CURRENT_USER_ATTRIBUTE, session.get());

        if (handler instanceof HandlerMethod handlerMethod) {
            RequireRoles requiredRoles = handlerMethod.getMethodAnnotation(RequireRoles.class);
            if (requiredRoles != null && Arrays.stream(requiredRoles.value()).noneMatch(role -> role == session.get().role())) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
                return false;
            }
        }

        return true;
    }
}
