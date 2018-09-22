#include <u.h>
#include <libc.h>

void
main(int argc, char **argv) {
	char *cmd = "/bin/rc";
	char buf[256];
	char winid[16];
	int r;
	rfork(RFNAMEG|RFFDG|RFENVG);
	//chdir(getenv("home"));
	int fd = open("/dev/hsys/new", OREAD);
	if (fd < 0)
		exits("open new");
	if ((r = read(fd, winid, 15)) <= 0)
		exits("read new");
	winid[r] = '\0';
	close(fd);
	snprint(buf, 255, "/dev/hsys/%s", winid);
	bind(buf, "/dev", MBEFORE);
	close(0);
	if(open("/dev/cons", OREAD) < 0){
		fprint(2, "can't open /dev/cons: %r\n");
		exits("/dev/cons");
	}
	close(1);
	if(open("/dev/cons", OWRITE) < 0){
		fprint(2, "can't open /dev/cons: %r\n");
		exits("open");	/* BUG? was terminate() */
	}
	dup(1, 2);
	exec(cmd, argv);
	exits("procexec");
}

