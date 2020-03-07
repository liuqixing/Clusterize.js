class A {
	static method1()
	{
		return 'method1 was called';
	}
}

if ( 'undefined' !== typeof module )
{
	module.exports	= A;
}
else
{
	exports	= A;
}
