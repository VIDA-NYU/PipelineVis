require(boot)
## code adapted from Bi and Chung 2011

johnsonR<-function(xx,w)
{ xx<-scale(xx)
p <- dim(xx)[2] - 1
x <- xx[, 2:(p + 1)]*w
y <- xx[, 1]
u <- svd(x)$u
v <- svd(x)$v
d <- svd(x)$d
z <- u %*% t(v)
bet <- cor(y, z)^2
x.dig <- cbind(y, z)
k <- dim(x.dig)[2]
rela <- seq(1, p)
for(i in 1:p) {
lam <- cor(x[, i], z)^2
rela[i] <- sum(bet * lam)
}
rela<-rela/sum(rela)
rela
}



johnsonBoot<-function(data){
	res = boot(data, johnsonR, R=999, stype="w")
	res$weights
}

