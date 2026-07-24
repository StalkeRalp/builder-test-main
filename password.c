#include <stdio.h>
#include <string.h>

int main() {
    char input[50];
    printf("Enter password: ");
    scanf("%s", input);
    
    if (strcmp(input, "secret123") == 0) {
        printf("Access granted!\n");
    } else {
        printf("Access denied!\n");
    }
    return 0;
}
